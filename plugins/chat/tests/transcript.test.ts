import type { AgentEvent } from "@yaa/contracts/agent-events";
import { describe, expect, it } from "vitest";
import {
	appendEvents,
	chatStatus,
	chatTitle,
	EMPTY_TRANSCRIPT,
	optionsSummary,
} from "../transcript.ts";

const prompt: AgentEvent = {
	type: "prompt",
	text: "Fix the greeting\nplease",
	attachments: [],
};
const read = (events: AgentEvent[]) => appendEvents(EMPTY_TRANSCRIPT, events);

describe("appendEvents", () => {
	it("joins chunks across batches, keeping untouched items", () => {
		const first = read([prompt, { type: "message", text: "Hel" }]);
		const second = appendEvents(first, [{ type: "message", text: "lo" }]);
		expect(second.items[1]).toEqual({ key: 1, kind: "message", text: "Hello" });
		expect(second.items[0]).toBe(first.items[0]);
		expect(first.items[1]).toMatchObject({ text: "Hel" });
		expect(second.count).toBe(3);
	});

	it("replaces a tool call's output with what an update names", () => {
		const { items } = read([
			{
				type: "tool.start",
				toolCallId: "run",
				title: "pnpm test",
				kind: "execute",
				status: "in_progress",
				output: [{ type: "text", text: "running" }],
			},
			{ type: "tool.update", toolCallId: "run", title: "pnpm run test" },
			{
				type: "tool.end",
				toolCallId: "run",
				status: "completed",
				output: [{ type: "text", text: "passed" }],
			},
		]);
		expect(items).toEqual([
			expect.objectContaining({
				title: "pnpm run test",
				tool: "execute",
				status: "completed",
				output: [{ type: "text", text: "passed" }],
			}),
		]);
	});

	it("takes a start for a new call, and stops calls left open", () => {
		const start: AgentEvent = {
			type: "tool.start",
			toolCallId: "run",
			title: "pnpm test",
			status: "in_progress",
		};
		const { items } = read([start, { type: "error", message: "gone" }, start]);
		expect(items).toEqual([
			expect.objectContaining({ status: "stopped" }),
			expect.objectContaining({ kind: "error" }),
			expect.objectContaining({ status: "in_progress" }),
		]);
	});

	it("shows how a turn ended only when the agent did not finish it", () => {
		const done = read([prompt, { type: "turn.end", stopReason: "end_turn" }]);
		const stopped = read([
			prompt,
			{ type: "turn.end", stopReason: "cancelled" },
		]);
		expect(done.items).toHaveLength(1);
		expect(done.running).toBe(false);
		expect(stopped.items.at(-1)).toMatchObject({
			kind: "stopped",
			reason: "cancelled",
		});
	});
});

describe("a restored chat", () => {
	it("closes an interrupted turn, leaving what it waited on unanswered", () => {
		const interrupted = read([
			prompt,
			{
				type: "permission",
				requestId: "0",
				toolCallId: "edit",
				title: "Edit",
				options: [],
			},
			{ type: "interrupted" },
		]);
		expect(interrupted.running).toBe(false);
		expect(interrupted.items.slice(1)).toEqual([
			expect.objectContaining({ kind: "permission", answer: null }),
			expect.objectContaining({ kind: "stopped", reason: "interrupted" }),
		]);
	});

	it("runs while its agent starts again, until the session opens", () => {
		const resuming = read([{ type: "resuming" }]);
		expect(resuming.running).toBe(true);
		expect(resuming.items).toEqual([{ key: 0, kind: "resumed" }]);
		const opened = appendEvents(resuming, [
			{ type: "capabilities", images: true },
		]);
		expect(opened.running).toBe(false);
		expect(opened.images).toBe(true);
	});
});

describe("chatStatus and chatTitle", () => {
	const permission: AgentEvent = {
		type: "permission",
		requestId: "0",
		toolCallId: "edit",
		options: [],
	};

	it("needs you while a request waits, and errs after a failed turn", () => {
		expect(chatStatus(read([prompt, permission]))).toBe("needs you");
		expect(
			chatStatus(
				read([
					prompt,
					permission,
					{ type: "permission.resolved", requestId: "0", optionId: "a" },
				]),
			),
		).toBe("running");
		expect(chatStatus(read([prompt, { type: "error", message: "gone" }]))).toBe(
			"error",
		);
	});

	it("names a chat by the agent's title, else by the first prompt", () => {
		expect(chatTitle(EMPTY_TRANSCRIPT)).toBe("New chat");
		expect(chatTitle(read([prompt]))).toBe("Fix the greeting");
		expect(chatTitle(read([prompt, { type: "title", title: "Greet" }]))).toBe(
			"Greet",
		);
	});
});

describe("optionsSummary", () => {
	const select = (
		id: string,
		category: string,
		value: string,
		values: string[],
	) => ({
		id,
		name: id,
		category,
		value,
		choices: values.map((choice) => ({
			value: choice,
			label: choice.toUpperCase(),
		})),
	});
	const model = select("model", "model", "opus", ["opus"]);
	const effort = select("effort", "thought_level", "high", ["high"]);
	const modes = ["default", "auto", "plan"];
	const mapping = {
		option: "mode",
		values: { ask: ["default"], risky: ["auto"], allow: ["bypass"] },
	};

	it("names the permission mode the agent is in, next to the model", () => {
		const mode = select("mode", "mode", "auto", modes);
		expect(optionsSummary([effort, mode, model], mapping)).toEqual([
			"OPUS",
			"Ask for risky actions",
			"HIGH",
		]);
	});

	it("names a mode of the agent's own as the agent does", () => {
		const mode = select("mode", "mode", "plan", modes);
		expect(optionsSummary([model, mode], mapping)).toEqual(["OPUS", "PLAN"]);
		expect(optionsSummary([model, mode], undefined)).toEqual(["OPUS", "PLAN"]);
	});

	it("keeps the agent's mode beside a permission option of its own", () => {
		const mode = select("mode", "mode", "plan", modes);
		const allowAll = select("allow_all", "other", "on", ["off", "on"]);
		const own = {
			option: "allow_all",
			values: { ask: ["off"], risky: ["auto"], allow: ["on"] },
		};
		expect(optionsSummary([model, mode, allowAll], own)).toEqual([
			"OPUS",
			"Allow all",
			"PLAN",
		]);
	});
});
