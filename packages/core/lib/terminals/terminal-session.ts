import {
	TERMINAL_ACK_CHARS,
	type TerminalSize,
	type TerminalSnapshot,
} from "@yaa/contracts/terminals";
import type { Mirror } from "./mirror.ts";
import type { Pty } from "./pty.ts";

// The program is paused once the mirror or a view is further than this behind
// its output, and resumed once all are within what a view may leave unsaid.
export const PAUSE_BEHIND_CHARS = 8 * TERMINAL_ACK_CHARS;

export type TerminalSession = {
	// Adds the view and gives it what is on the terminal; `output` carries
	// what follows.
	attach(view: string, size: TerminalSize): Promise<TerminalSnapshot>;
	detach(view: string): void;
	// The view has shown the output up to `offset`.
	ack(view: string, offset: number): void;
	write(data: string): void;
	resize(size: TerminalSize): void;
	title(): string;
	cwd(): string | undefined;
	kill(): void;
};

type SessionOptions = {
	pty: Pty;
	mirror: Mirror;
	output(data: string, offset: number): void;
	exited(): void;
};

// One running terminal: its program, the mirror of its screen, its views and
// the flow of output between them. Offsets count characters of output.
export const createTerminalSession = ({
	pty,
	mirror,
	output,
	exited,
}: SessionOptions): TerminalSession => {
	let received = 0;
	// How far the mirror is.
	let parsed = 0;
	// Where each view started and how far it is.
	const views = new Map<string, { from: number; shown: number }>();
	let paused = false;

	const flow = () => {
		const slowest = Math.min(
			parsed,
			...[...views.values()].map(({ shown }) => shown),
		);
		const behind = received - slowest;
		if (!paused && behind > PAUSE_BEHIND_CHARS) {
			paused = true;
			pty.pause();
		} else if (paused && behind <= TERMINAL_ACK_CHARS) {
			paused = false;
			pty.resume();
		}
	};

	pty.onData((data) => {
		received += data.length;
		const offset = received;
		mirror.write(data, () => {
			parsed = offset;
			flow();
		});
		output(data, offset);
		flow();
	});
	// A query is answered by the views that got it. With none, as while the app
	// reloads, the mirror answers, so the program does not wait forever. The
	// mirror is then taking in what follows `parsed`.
	mirror.onReply((data) => {
		if (![...views.values()].some(({ from }) => from <= parsed)) {
			pty.write(data);
		}
	});
	pty.onExit(() => {
		mirror.dispose();
		exited();
	});

	const resize = (size: TerminalSize) => {
		pty.resize(size);
		mirror.resize(size);
	};

	return {
		async attach(view, size) {
			resize(size);
			const offset = received;
			views.set(view, { from: offset, shown: offset });
			flow();
			return { data: await mirror.snapshot(), offset };
		},
		detach(view) {
			if (views.delete(view)) flow();
		},
		ack(view, offset) {
			const found = views.get(view);
			if (found === undefined || offset <= found.shown) return;
			found.shown = offset;
			flow();
		},
		write: (data) => pty.write(data),
		resize,
		title: () => pty.title(),
		cwd: () => pty.cwd(),
		kill() {
			// A paused program's end would not be read.
			if (paused) pty.resume();
			pty.kill();
		},
	};
};
