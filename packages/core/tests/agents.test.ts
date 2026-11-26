import type { AgentEvent } from "@yaa/contracts/agent-events";
import { createLogger } from "@yaa/contracts/log";
import { connectFakeAgent } from "@yaa/fake-agent";
import { describe, expect, it } from "vitest";
import { normalizeQuestion, openAcpSession } from "../agents.ts";

const log = createLogger(() => {}, "core");

// A session with the fake agent in this process, playing turns without
// delays. `answer` runs on each event, to answer what the turn waits on.
const fakeSession = async (
	answer: (
		event: AgentEvent,
		session: () => Awaited<ReturnType<typeof openAcpSession>>,
	) => void = () => {},
) => {
	const events: AgentEvent[] = [];
	let turnOver: () => void = () => {};
	const session = await openAcpSession({
		stream: connectFakeAgent({ delayScale: 0 }),
		cwd: "/fake",
		log,
		emit(event) {
			events.push(event);
			queueMicrotask(() => answer(event, () => session));
			if (event.type === "turn.end" || event.type === "error") turnOver();
		},
	});
	const turn = (text: string) =>
		new Promise<void>((resolve) => {
			turnOver = resolve;
			session.prompt(text);
		});
	return { session, events, turn };
};

describe("openAcpSession with the fake agent", () => {
	it("streams a turn as normalized events, waiting for answers", async () => {
		const { events, turn } = await fakeSession((event, session) => {
			if (event.type === "permission") {
				session().answerPermission(event.requestId, "allow");
			}
			if (event.type === "question") {
				session().answerQuestion(event.requestId, {
					action: "accept",
					values: { farewell: "keep" },
				});
			}
		});
		await turn("Make the greeting friendlier");

		const types = events.map(({ type }) => type);
		expect(types[0]).toBe("config");
		expect(types.slice(1, 3)).toEqual(["prompt", "commands"]);
		expect(types).toContain("thinking");
		expect(types).toContain("plan");
		expect(types.indexOf("permission.resolved")).toBeGreaterThan(
			types.indexOf("permission"),
		);
		expect(events).toContainEqual({
			type: "permission.resolved",
			requestId: "0",
			optionId: "allow",
		});
		expect(events).toContainEqual({
			type: "question.resolved",
			requestId: "1",
			action: "accept",
		});
		expect(events.at(-1)).toMatchObject({
			type: "turn.end",
			stopReason: "end_turn",
			tokens: { input: 1800, output: 550, total: 2350 },
		});
		const message = events
			.flatMap((event) => (event.type === "message" ? event.text : []))
			.join("");
		expect(message).toContain("Hi there!");
	});

	it("ends a failing turn with an error", async () => {
		const { events, turn } = await fakeSession();
		await turn("/fail");
		expect(events.at(-1)).toEqual({
			type: "error",
			message:
				"Internal error: The fake agent lost its connection to the model",
		});
	});

	it("answers a waiting permission request as cancelled on cancel", async () => {
		const { events, turn } = await fakeSession((event, session) => {
			if (event.type === "permission") session().cancel();
		});
		await turn("/edit");
		expect(events).toContainEqual({
			type: "permission.resolved",
			requestId: "0",
			optionId: null,
		});
		expect(events.at(-1)).toMatchObject({
			type: "turn.end",
			stopReason: "cancelled",
		});
	});
});

describe("normalizeQuestion", () => {
	it("reads choices, text, numbers and yes or no", () => {
		const { fields, unsupported } = normalizeQuestion({
			type: "object",
			properties: {
				pick: { type: "string", oneOf: [{ const: "a", title: "A" }] },
				tags: { type: "array", items: { enum: ["x", "y"] } },
				note: { type: "string", title: "Note" },
				count: { type: "integer" },
				sure: { type: "boolean" },
			},
			required: ["pick"],
		});
		expect(unsupported).toEqual([]);
		expect(fields).toEqual([
			{
				kind: "choice",
				name: "pick",
				title: "pick",
				required: true,
				multiple: false,
				choices: [{ value: "a", label: "A" }],
			},
			{
				kind: "choice",
				name: "tags",
				title: "tags",
				required: false,
				multiple: true,
				choices: [
					{ value: "x", label: "x" },
					{ value: "y", label: "y" },
				],
			},
			{ kind: "text", name: "note", title: "Note", required: false },
			{
				kind: "number",
				name: "count",
				title: "count",
				required: false,
				integer: true,
			},
			{ kind: "boolean", name: "sure", title: "sure", required: false },
		]);
	});

	it("names the properties it cannot show", () => {
		const { fields, unsupported } = normalizeQuestion({
			properties: { when: { type: "object" } },
		});
		expect(fields).toEqual([]);
		expect(unsupported).toEqual(["when"]);
	});
});
