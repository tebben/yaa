import { tmpdir } from "node:os";
import { createLogger } from "@yaa/contracts/log";
import type { Caller } from "@yaa/contracts/server";
import { TERMINAL_ACK_CHARS } from "@yaa/contracts/terminals";
import { describe, expect, it } from "vitest";
import { createProjects } from "../projects.ts";
import { openDatabase } from "../storage.ts";
import {
	createTerminals,
	PAUSE_BEHIND_CHARS,
	type Pty,
	type SpawnPty,
} from "../terminals.ts";

const SIZE = { cols: 80, rows: 24 };

const createFakePty = () => {
	let data = (_: string) => {};
	let exit = () => {};
	const state = {
		written: [] as string[],
		paused: false,
		killed: false,
		cwd: undefined as string | undefined,
	};
	const pty: Pty = {
		write: (text) => state.written.push(text),
		resize: () => {},
		pause: () => {
			state.paused = true;
		},
		resume: () => {
			state.paused = false;
		},
		kill: () => {
			state.killed = true;
		},
		onData: (listener) => {
			data = listener;
		},
		onExit: (listener) => {
			exit = listener;
		},
		title: () => "zsh",
		cwd: () => state.cwd,
	};
	return {
		pty,
		state,
		print: (text: string) => data(text),
		exit: () => exit(),
	};
};

const caller = () => {
	const closing: (() => void)[] = [];
	const connection: Caller = {
		onClose: (listener) => closing.push(listener),
	};
	return {
		connection,
		close: () => {
			for (const listener of closing) listener();
		},
	};
};

const setup = async () => {
	const db = openDatabase(":memory:");
	const projects = createProjects({
		db,
		git: {
			mainCheckout: async (path) => path,
			defaultBranch: async () => "main",
		},
		home: "/home/nobody",
	});
	const added = await projects.add(tmpdir());
	if ("problem" in added) throw new Error(added.problem);
	const [worktree] = added.project.worktrees;
	if (worktree === undefined) throw new Error("No worktree");
	const ptys: ReturnType<typeof createFakePty>[] = [];
	const cwds: string[] = [];
	const spawn: SpawnPty = ({ cwd }) => {
		const fake = createFakePty();
		ptys.push(fake);
		cwds.push(cwd);
		return fake.pty;
	};
	const open = () =>
		createTerminals({
			db,
			worktree: () => worktree,
			log: createLogger(() => {}, "core"),
			env: {},
			spawn,
		});
	const terminals = open();
	const id = terminals.create(worktree.id);
	const attach = async (view: string, from = caller()) => {
		const snapshot = await terminals.attach(
			{ id, view },
			SIZE,
			from.connection,
		);
		const fake = ptys.at(-1);
		if (fake === undefined) throw new Error("Nothing was spawned");
		return { snapshot, fake };
	};
	return { terminals, open, worktree: worktree.id, id, attach, cwds };
};

describe("terminals", () => {
	it("gives a view that attaches later what is on the terminal", async () => {
		const { attach } = await setup();
		const { fake } = await attach("first");
		fake.print("hello\r\n");
		fake.print("\x1b[?1006h\x1b[?25l");
		const { snapshot } = await attach("second");
		expect(snapshot.data).toContain("hello");
		expect(snapshot.data).toContain("\x1b[?1006h\x1b[?25l");
		expect(snapshot.offset).toBe("hello\r\n\x1b[?1006h\x1b[?25l".length);
	});

	it("pauses the program while a view is far behind", async () => {
		const { terminals, id, attach } = await setup();
		const { fake } = await attach("view");
		const output = "x".repeat(PAUSE_BEHIND_CHARS + 1);
		fake.print(output);
		// The mirror catches up, so only the view holds it back.
		await attach("other");
		terminals.detach(id, "other");
		expect(fake.state.paused).toBe(true);
		terminals.ack(id, "view", output.length - TERMINAL_ACK_CHARS - 1);
		expect(fake.state.paused).toBe(true);
		terminals.ack(id, "view", output.length - TERMINAL_ACK_CHARS);
		expect(fake.state.paused).toBe(false);
	});

	it("lets go of a view whose connection closes", async () => {
		const { attach } = await setup();
		const page = caller();
		const { fake } = await attach("view", page);
		fake.print("x".repeat(PAUSE_BEHIND_CHARS + 1));
		await new Promise<void>((resolve) => setImmediate(resolve));
		page.close();
		await expect.poll(() => fake.state.paused).toBe(false);
	});

	it("answers a program's query only while no view can", async () => {
		const { terminals, id, attach } = await setup();
		const { fake } = await attach("view");
		const query = "\x1b[6n";
		fake.print(query);
		await attach("second");
		expect(fake.state.written).toEqual([]);
		terminals.detach(id, "view");
		terminals.detach(id, "second");
		fake.print(query);
		await expect.poll(() => fake.state.written).toEqual(["\x1b[1;1R"]);
	});

	it("opens a terminal where it was when the core ended", async () => {
		const { terminals, open, worktree, id, attach, cwds } = await setup();
		const { fake } = await attach("view");
		fake.state.cwd = "/";
		terminals.shutdown();
		// The program ends because the core does: the terminal stays.
		fake.exit();
		expect(fake.state.killed).toBe(true);
		const next = open();
		expect(next.list(worktree)).toMatchObject([{ id, cwd: "/" }]);
		await next.attach({ id, view: "view" }, SIZE, caller().connection);
		expect(cwds).toEqual([tmpdir(), "/"]);
	});

	it("opens in the worktree's folder once the directory is gone", async () => {
		const { terminals, open, id, attach, cwds } = await setup();
		const { fake } = await attach("view");
		fake.state.cwd = `${tmpdir()}/yaa-removed`;
		terminals.shutdown();
		await open().attach({ id, view: "view" }, SIZE, caller().connection);
		expect(cwds.at(-1)).toBe(tmpdir());
	});

	it("forgets a terminal whose program ends", async () => {
		const { terminals, worktree, attach } = await setup();
		const changed: string[] = [];
		terminals.onChange((id) => changed.push(id));
		const { fake } = await attach("view");
		fake.exit();
		expect(terminals.list(worktree)).toEqual([]);
		expect(changed).toEqual([worktree]);
	});
});
