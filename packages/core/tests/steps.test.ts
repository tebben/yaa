import type { CoreEvent } from "@yaa/contracts/core-events";
import { createLogger, type LogRecord } from "@yaa/contracts/log";
import { worktreeSteps } from "@yaa/contracts/worktree-steps";
import { describe, expect, it } from "vitest";
import { createStepsRunner } from "../projects.ts";

const target = {
	worktree: "w1",
	index: 3,
	path: "/wt/one",
	checkout: "/repo",
};

// Steps from `file`, with a command that writes one line and succeeds, fails
// when named `false`, or runs until stopped when named `forever`.
const setup = (file: object) => {
	const events: CoreEvent[] = [];
	const lines: LogRecord[] = [];
	const ran: string[] = [];
	const runner = createStepsRunner({
		git: { untracked: async () => [".env"] },
		events: { append: (event) => events.push(event) },
		log: createLogger((record) => lines.push(record), "core"),
		env: {},
		read: async () => worktreeSteps.parse(file),
		copy: async ({ paths, copied }) => {
			for (const path of paths) copied(path);
		},
		run: async ({ command, cwd, env, signal, line }) => {
			ran.push(`${cwd} ${env["YAA_WORKTREE_INDEX"]} ${command}`);
			line(`out of ${command}`);
			if (command === "forever") {
				await new Promise((resolve) =>
					signal.addEventListener("abort", resolve, { once: true }),
				);
			}
			return command === "false" ? { problem: "exit code 1" } : {};
		},
	});
	return { runner, events, lines, ran };
};

const types = (events: readonly CoreEvent[]) => events.map(({ type }) => type);

// Lets the runner get as far as its command.
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("worktree steps", () => {
	it("copies, then runs the commands in the worktree with its index, logging each line", async () => {
		const { runner, events, lines, ran } = setup({
			copy: [".env*"],
			setup: ["one", "two"],
			teardown: ["down"],
		});
		await expect(runner.setup(target)).resolves.toEqual({});
		expect(ran).toEqual(["/wt/one 3 one", "/wt/one 3 two"]);
		expect(lines.map(({ message, data }) => [data?.["step"], message])).toEqual(
			[
				["copy", "Copied .env"],
				["one", "$ one"],
				["one", "out of one"],
				["two", "$ two"],
				["two", "out of two"],
			],
		);
		expect(lines[0]?.data).toMatchObject({ worktree: "w1", phase: "setup" });
		expect(types(events)).toEqual([
			"worktree.steps.started",
			"worktree.steps.succeeded",
		]);
	});

	it("stops at the first failed step and records its last lines", async () => {
		const { runner, events, ran } = setup({ setup: ["false", "never"] });
		await expect(runner.setup(target)).resolves.toEqual({
			problem: "false: exit code 1",
		});
		expect(ran).toHaveLength(1);
		expect(events.at(-1)).toEqual({
			type: "worktree.steps.failed",
			worktree: "w1",
			phase: "setup",
			step: "false",
			reason: "exit code 1",
			output: ["$ false", "out of false"],
		});
	});

	it("records nothing for a phase without steps", async () => {
		const { runner, events } = setup({ setup: ["one"] });
		await expect(runner.teardown(target)).resolves.toEqual({});
		expect(events).toEqual([]);
	});

	it("stops a running setup before tearing down, even one just started", async () => {
		const { runner, events, ran } = setup({
			setup: ["forever", "never"],
			teardown: ["down"],
		});
		const settingUp = runner.setup(target);
		await settle();
		await runner.teardown(target);
		await expect(settingUp).resolves.toEqual({ problem: "forever: Stopped" });
		runner.setup(target);
		await runner.stop("w1");
		expect(ran).toEqual(["/wt/one 3 forever", "/wt/one 3 down"]);
		expect(types(events).slice(-2)).toEqual([
			"worktree.steps.started",
			"worktree.steps.failed",
		]);
	});

	it("records a run that is under way when the core exits, once", async () => {
		const { runner, events } = setup({ setup: ["forever"] });
		const settingUp = runner.setup(target);
		await settle();
		runner.shutdown();
		await settingUp;
		expect(types(events)).toEqual([
			"worktree.steps.started",
			"worktree.steps.failed",
		]);
	});
});
