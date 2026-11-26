import { type CoreEvent, coreEvent } from "@yaa/contracts/core-events";
import { describe, expect, it } from "vitest";
import {
	chatEvent,
	createStateTracker,
	highestState,
	reduceState,
	type StateSources,
	stateOf,
} from "../state.ts";
import { createEventLog, openDatabase } from "../storage.ts";

const worktree = "w";
const first = { worktree, chat: "first" };
const second = { worktree, chat: "second" };
const setup = { worktree, phase: "setup" } as const;
const turn: CoreEvent = { type: "chat.turn.started", ...first };
const failedTurn: CoreEvent = {
	type: "chat.turn.failed",
	...first,
	reason: "lost",
};
const steps: CoreEvent = { type: "worktree.steps.started", ...setup };
const failedSteps: CoreEvent = {
	type: "worktree.steps.failed",
	...setup,
	step: "pnpm install",
	reason: "Exit code 1",
	output: [],
};
const done: CoreEvent = { type: "worktree.done.set", worktree, done: true };
const request = (
	type: "opened" | "resolved",
	requestId: string,
): CoreEvent => ({
	type: `chat.request.${type}`,
	...first,
	requestId,
});

const after = (...events: CoreEvent[]) => {
	const none: StateSources = new Map();
	const sources = events.reduce(reduceState, none).get(worktree);
	return sources === undefined ? "idle" : stateOf(sources);
};

describe("highestState", () => {
	it("orders attention, error, running, done, idle", () => {
		expect(highestState([])).toBe("idle");
		expect(highestState(["idle", "done"])).toBe("done");
		expect(highestState(["done", "running"])).toBe("running");
		expect(highestState(["running", "error"])).toBe("error");
		expect(highestState(["error", "attention"])).toBe("attention");
	});
});

describe("reduceState", () => {
	it("needs attention until every request of a turn is resolved", () => {
		const events: CoreEvent[] = [
			turn,
			request("opened", "0"),
			request("opened", "1"),
			request("resolved", "0"),
			request("resolved", "1"),
			{ type: "chat.turn.ended", ...first },
		];
		expect(events.map((_, at) => after(...events.slice(0, at + 1)))).toEqual([
			"running",
			"attention",
			"attention",
			"attention",
			"running",
			"idle",
		]);
	});

	it("keeps a failed turn's error until that chat's next turn", () => {
		const other: CoreEvent = { type: "chat.turn.started", ...second };
		expect(after(turn, failedTurn, other)).toBe("error");
		expect(after(turn, failedTurn, turn)).toBe("running");
	});

	it("runs and fails with the steps, until a turn moves on", () => {
		expect(after(steps)).toBe("running");
		expect(after(steps, { type: "worktree.steps.succeeded", ...setup })).toBe(
			"idle",
		);
		expect(after(steps, failedSteps)).toBe("error");
		expect(after(steps, failedSteps, turn)).toBe("running");
	});

	it("keeps the done mark until it is taken off or work starts", () => {
		const ended: CoreEvent = { type: "chat.turn.ended", ...first };
		expect(after(done)).toBe("done");
		expect(after(done, { ...done, done: false })).toBe("idle");
		expect(after(done, turn, ended)).toBe("idle");
		expect(
			after(done, steps, { type: "worktree.steps.succeeded", ...setup }),
		).toBe("idle");
	});

	it("ends what was under way when core starts again", () => {
		const restart: CoreEvent = { type: "core.started", pid: 1 };
		expect(after(turn, request("opened", "0"), restart)).toBe("idle");
		expect(after(turn, failedTurn, restart)).toBe("error");
		expect(after(steps, restart)).toBe("error");
		expect(after(done, restart)).toBe("done");
	});
});

describe("chatEvent", () => {
	it("keeps only what changes state", () => {
		expect(chatEvent(first, { type: "message", text: "hi" })).toBeUndefined();
		expect(
			chatEvent(first, {
				type: "question.resolved",
				requestId: "0",
				action: "accept",
			}),
		).toEqual(request("resolved", "0"));
	});
});

describe("createStateTracker", () => {
	it("derives the same states from a long log after a restart", () => {
		const log = createEventLog(openDatabase(":memory:"), coreEvent);
		const tracker = createStateTracker(log);
		let changes = 0;
		tracker.onChange(() => {
			changes += 1;
		});
		// More events than one read of the log returns.
		for (let count = 0; count < 600; count += 1) {
			tracker.append(turn);
			tracker.append({ type: "chat.turn.ended", ...first });
		}
		tracker.append(done);
		tracker.append(done);
		expect(changes).toBe(1201);
		expect(createStateTracker(log).states()).toEqual({ w: "done" });
	});
});
