import type { AgentEvent } from "@yaa/contracts/agent-events";
import { describe, expect, it } from "vitest";
import {
	appendEvents,
	chatStatus,
	chatTitle,
	EMPTY_TRANSCRIPT,
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
