import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { errorData, type Logger } from "@yaa/contracts/log";
import type { Worktree } from "@yaa/contracts/projects";
import type { Caller } from "@yaa/contracts/server";
import type {
	Terminal,
	TerminalOutput,
	TerminalSize,
	TerminalSnapshot,
} from "@yaa/contracts/terminals";
import { createMirror } from "./mirror.ts";
import { type SpawnPty, spawnPty } from "./pty.ts";
import {
	createTerminalSession,
	type TerminalSession,
} from "./terminal-session.ts";
import { createTerminalStore } from "./terminal-store.ts";

export type Terminals = {
	// Oldest first.
	list(worktree: string): Terminal[];
	create(worktree: string): string;
	// Ends the terminal's program and forgets it.
	close(id: string): void;
	// Starts the terminal's shell if it is not running. The view goes with the
	// caller's connection.
	attach(
		view: { id: string; view: string },
		size: TerminalSize,
		caller: Caller,
	): Promise<TerminalSnapshot>;
	// These do nothing for a terminal that has ended meanwhile.
	detach(id: string, view: string): void;
	ack(id: string, view: string, offset: number): void;
	write(id: string, data: string): void;
	resize(id: string, size: TerminalSize): void;
	// Ends the programs of worktrees that are not in `worktrees`.
	keep(worktrees: ReadonlySet<string>): void;
	// For the core's exit: keeps where each terminal is and ends its program,
	// before returning.
	shutdown(): void;
	onOutput(listener: (output: TerminalOutput) => void): void;
	onChange(listener: (worktree: string) => void): void;
};

type TerminalsOptions = {
	db: DatabaseSync;
	worktree(id: string): Worktree;
	log: Logger;
	env?: NodeJS.ProcessEnv;
	spawn?: SpawnPty;
	newId?: () => string;
};

// How often, at most, a running terminal's title and directory are read
// while it writes output.
const LOOK_EVERY_MS = 500;

// What a shell in a terminal gets: the app's environment without what
// Electron and yaa set for the app itself.
const shellEnv = (env: NodeJS.ProcessEnv, index: number) => ({
	...Object.fromEntries(
		Object.entries(env).filter(([name]) => !/^(ELECTRON|YAA)_/.test(name)),
	),
	TERM: "xterm-256color",
	COLORTERM: "truecolor",
	TERM_PROGRAM: "yaa",
	YAA_WORKTREE_INDEX: String(index),
});

type Running = {
	session: TerminalSession;
	worktree: string;
	title: string;
	looking: NodeJS.Timeout | undefined;
};

// The terminals of all worktrees (docs/spec/07-editor-files-terminal.md).
// Core owns their programs; the database keeps the list and each one's
// directory, so they open there again after a restart.
export const createTerminals = ({
	db,
	worktree,
	log,
	env = process.env,
	spawn = spawnPty,
	newId = randomUUID,
}: TerminalsOptions): Terminals => {
	const store = createTerminalStore(db);
	const running = new Map<string, Running>();
	const outputListeners = new Set<(output: TerminalOutput) => void>();
	const changeListeners = new Set<(worktree: string) => void>();
	const shell = env["SHELL"] || "/bin/sh";
	let closed = false;

	const changed = (id: string) => {
		for (const listener of changeListeners) listener(id);
	};

	// Reads where the terminal is and what runs in it; true when either is new.
	const look = (id: string, terminal: Running) => {
		clearTimeout(terminal.looking);
		terminal.looking = undefined;
		const record = store.get(id);
		if (record === undefined) return false;
		const cwd = terminal.session.cwd() ?? record.cwd;
		const title = terminal.session.title();
		if (cwd === record.cwd && title === terminal.title) return false;
		store.move(id, cwd);
		terminal.title = title;
		return true;
	};

	const stop = (id: string) => {
		const terminal = running.get(id);
		if (terminal === undefined) return;
		running.delete(id);
		clearTimeout(terminal.looking);
		terminal.session.kill();
	};

	const close = (id: string) => {
		const record = store.get(id);
		stop(id);
		if (record === undefined) return;
		store.remove(id);
		changed(record.worktree);
	};

	const start = (id: string, size: TerminalSize) => {
		const record = store.get(id);
		if (record === undefined) throw new Error(`No terminal ${id}`);
		const { path, index } = worktree(record.worktree);
		// A directory removed since leaves the terminal in the worktree's folder.
		const cwd = existsSync(record.cwd) ? record.cwd : path;
		const pty = spawn({ shell, cwd, env: shellEnv(env, index), ...size });
		const terminal: Running = {
			worktree: record.worktree,
			title: basename(shell),
			looking: undefined,
			session: createTerminalSession({
				pty,
				mirror: createMirror(size),
				output(data, offset) {
					for (const listener of outputListeners) {
						listener({ id, data, offset });
					}
					terminal.looking ??= setTimeout(() => {
						if (look(id, terminal)) changed(terminal.worktree);
					}, LOOK_EVERY_MS);
				},
				exited() {
					// Not one that was closed, or ended with the core.
					if (closed || running.get(id) !== terminal) return;
					log.info("terminal ended", { terminal: id });
					close(id);
				},
			}),
		};
		running.set(id, terminal);
		log.info("terminal started", { terminal: id, worktree: record.worktree });
		return terminal;
	};

	return {
		list: (id) =>
			store.list(id).map((record) => ({
				...record,
				title: running.get(record.id)?.title ?? basename(shell),
			})),
		create(id) {
			const created = { id: newId(), worktree: id, cwd: worktree(id).path };
			store.add(created);
			changed(id);
			return created.id;
		},
		close,
		async attach({ id, view }, size, caller) {
			const terminal = running.get(id) ?? start(id, size);
			const snapshot = terminal.session.attach(view, size);
			caller.onClose(() => running.get(id)?.session.detach(view));
			return snapshot;
		},
		detach: (id, view) => running.get(id)?.session.detach(view),
		ack: (id, view, offset) => running.get(id)?.session.ack(view, offset),
		write: (id, data) => running.get(id)?.session.write(data),
		resize: (id, size) => running.get(id)?.session.resize(size),
		keep(worktrees) {
			for (const [id, terminal] of running) {
				if (!worktrees.has(terminal.worktree)) stop(id);
			}
		},
		shutdown() {
			closed = true;
			for (const [id, terminal] of running) {
				try {
					look(id, terminal);
				} catch (error) {
					log.error("could not keep a terminal's directory", errorData(error));
				}
				stop(id);
			}
		},
		onOutput(listener) {
			outputListeners.add(listener);
		},
		onChange(listener) {
			changeListeners.add(listener);
		},
	};
};
