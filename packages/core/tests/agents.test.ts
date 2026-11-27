import { tmpdir } from "node:os";
import {
	agent as acpAgent,
	ndJsonStream,
	PROTOCOL_VERSION,
	RequestError,
	type Stream,
} from "@agentclientprotocol/sdk/unstable";
import type { AgentEvent } from "@yaa/contracts/agent-events";
import { createLogger } from "@yaa/contracts/log";
import type { ProviderStatus } from "@yaa/contracts/providers";
import { connectFakeAgent } from "@yaa/fake-agent";
import { describe, expect, it } from "vitest";
import {
	createAgentInspector,
	normalizeQuestion,
	openAcpSession,
	promptContent,
	startAgentProcess,
	workUnderWay,
} from "../agents.ts";

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
		agent: {
			stream: connectFakeAgent({ delayScale: 0 }),
			exited: new Promise(() => {}),
		},
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
			session.prompt(text, []);
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
		expect(types.slice(0, 4)).toEqual([
			"commands",
			"capabilities",
			"config",
			"prompt",
		]);
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

	it("follows the options the agent reports after a change", async () => {
		const { session, events } = await fakeSession();
		await session.setConfig("model", "fake-small");
		const config = events.findLast(({ type }) => type === "config");
		expect(
			config?.type === "config" && config.options.map(({ id }) => id),
		).toEqual(["model", "mode"]);
	});

	it("resumes a session by the agent's id, with its options", async () => {
		const { session } = await fakeSession();
		await session.setConfig("model", "fake-small");
		const events: AgentEvent[] = [];
		const resumed = await openAcpSession({
			agent: {
				stream: connectFakeAgent({ delayScale: 0 }),
				exited: new Promise(() => {}),
			},
			cwd: "/fake",
			resume: session.id,
			log,
			emit: (event) => events.push(event),
		});
		expect(resumed.id).toBe(session.id);
		expect(events.map(({ type }) => type)).toEqual([
			"commands",
			"capabilities",
			"config",
		]);
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

// Copilot CLI 1.0.116 signed out: a terminal login method, and every
// session refused with ACP's auth_required.
const signedOut = (): Stream => {
	const toAgent = new TransformStream<Uint8Array, Uint8Array>();
	const toClient = new TransformStream<Uint8Array, Uint8Array>();
	acpAgent({ name: "signed-out" })
		.onRequest("initialize", () => ({
			protocolVersion: PROTOCOL_VERSION,
			authMethods: [
				{
					type: "terminal",
					id: "copilot-login",
					name: "Log in with Copilot CLI",
					description: "Run `copilot login` in the terminal",
				},
			],
		}))
		.onRequest("session/new", () => {
			throw RequestError.authRequired();
		})
		.connect(ndJsonStream(toClient.writable, toAgent.readable));
	return ndJsonStream(toAgent.writable, toClient.readable);
};

describe("openAcpSession with a signed-out agent", () => {
	it("fails the start with how to sign in", async () => {
		await expect(
			openAcpSession({
				agent: { stream: signedOut(), exited: new Promise(() => {}) },
				cwd: "/fake",
				log,
				emit() {},
			}),
		).rejects.toThrow(
			"The agent needs you to sign in. Run `copilot login` in the terminal",
		);
	});
});

describe("createAgentInspector", () => {
	const inspect = (status: ProviderStatus, stream: () => Stream) =>
		createAgentInspector({
			status: async () => status,
			launch: async () => ({ command: "agent", args: [], env: {} }),
			dir: tmpdir(),
			log,
			agentLog: log,
			start: () => ({
				stream: stream(),
				exited: new Promise(() => {}),
				stop() {},
				kill() {},
			}),
		}).inspect("agent");
	const ready: ProviderStatus = { state: "ready", version: "1.0" };

	it("reports the models of an agent that opens a session", async () => {
		await expect(
			inspect(ready, () => connectFakeAgent({ delayScale: 0 })),
		).resolves.toMatchObject({
			state: "connected",
			version: "1.0",
			models: expect.arrayContaining([
				expect.objectContaining({ value: "fake-small" }),
			]),
		});
	});

	it("reports signed out when the agent refuses the session", async () => {
		await expect(inspect(ready, signedOut)).resolves.toMatchObject({
			state: "signed-out",
			how: expect.stringContaining("copilot login"),
		});
	});

	it("starts no agent for a provider that is not ready", async () => {
		await expect(
			inspect({ state: "missing", problem: "not found" }, () => {
				throw new Error("started");
			}),
		).resolves.toEqual({ state: "missing", problem: "not found" });
	});
});

describe("openAcpSession with a value listed twice", () => {
	// Copilot CLI 1.0.117 lists the model `auto` twice.
	const listsTwice = (): Stream => {
		const toAgent = new TransformStream<Uint8Array, Uint8Array>();
		const toClient = new TransformStream<Uint8Array, Uint8Array>();
		acpAgent({ name: "lists-twice" })
			.onRequest("initialize", () => ({ protocolVersion: PROTOCOL_VERSION }))
			.onRequest("session/new", () => ({
				sessionId: "1",
				configOptions: [
					{
						type: "select",
						id: "model",
						name: "Model",
						currentValue: "auto",
						options: [
							{ value: "auto", name: "Auto" },
							{ value: "auto", name: "Auto" },
							{ value: "small", name: "Small" },
						],
					},
				],
			}))
			.connect(ndJsonStream(toClient.writable, toAgent.readable));
		return ndJsonStream(toAgent.writable, toClient.readable);
	};

	it("offers it once", async () => {
		const events: AgentEvent[] = [];
		await openAcpSession({
			agent: { stream: listsTwice(), exited: new Promise(() => {}) },
			cwd: "/fake",
			log,
			emit: (event) => events.push(event),
		});
		const config = events.find(({ type }) => type === "config");
		expect(config?.type === "config" && config.options[0]?.choices).toEqual([
			{ value: "auto", label: "Auto" },
			{ value: "small", label: "Small" },
		]);
	});
});

describe("promptContent", () => {
	const file = { type: "file", path: "/repo/a b.ts" } as const;
	const image = {
		type: "image",
		name: "shot.png",
		mimeType: "image/png",
		data: "AA==",
	} as const;

	it("links files and carries images, keeping no image data", () => {
		const { blocks, sent } = promptContent("look", [file, image], {
			images: true,
		});
		expect(blocks).toEqual([
			{ type: "text", text: "look" },
			{
				type: "resource_link",
				name: "a b.ts",
				uri: "file:///repo/a%20b.ts",
			},
			{ type: "image", mimeType: "image/png", data: "AA==" },
		]);
		expect(sent).toEqual([file, { type: "image", name: "shot.png" }]);
	});

	it("refuses an image the agent does not take, and an empty prompt", () => {
		expect(() => promptContent("", [image], { images: false })).toThrow(
			"takes no images",
		);
		expect(() => promptContent("", [], { images: true })).toThrow("empty");
	});
});

describe("startAgentProcess", () => {
	const run = (script: string) =>
		startAgentProcess({
			launch: { command: "/bin/sh", args: ["-c", script], env: {} },
			cwd: "/",
			log,
		});

	it("reports an exit with the last lines the agent wrote", async () => {
		const agent = run("echo no model >&2; exit 3");
		await expect(
			openAcpSession({ agent, cwd: "/", log, emit: () => {} }),
		).rejects.toThrow("The agent exited with code 3\nno model");
	});

	it("says when the agent could not start", async () => {
		const agent = startAgentProcess({
			launch: { command: "/nowhere/agent", args: [], env: {} },
			cwd: "/",
			log,
		});
		await expect(agent.exited).resolves.toContain("could not start");
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

describe("workUnderWay", () => {
	const prompt: AgentEvent = { type: "prompt", text: "go", attachments: [] };
	const ended: AgentEvent = { type: "turn.end", stopReason: "end_turn" };
	const opened: AgentEvent = { type: "capabilities", images: false };

	it("sees a turn or a resume that nothing ended", () => {
		expect(workUnderWay([])).toBe(false);
		expect(workUnderWay([opened, prompt, { type: "message", text: "a" }])).toBe(
			true,
		);
		expect(workUnderWay([opened, prompt, ended])).toBe(false);
		expect(workUnderWay([prompt, { type: "interrupted" }])).toBe(false);
		expect(workUnderWay([prompt, ended, { type: "resuming" }])).toBe(true);
		expect(workUnderWay([ended, { type: "resuming" }, opened])).toBe(false);
	});
});
