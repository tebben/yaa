import { randomUUID } from "node:crypto";
import {
	type AgentApp,
	type AgentContext,
	agent,
	type ClientCapabilities,
	ndJsonStream,
	PROTOCOL_VERSION,
	type PromptRequest,
	type PromptResponse,
	RequestError,
	type SessionConfigOption,
	type Stream,
} from "@agentclientprotocol/sdk/unstable";
import { editTurn } from "../turns/edit.ts";
import { failingTurn } from "../turns/failing.ts";
import { markdownTurn } from "../turns/markdown.ts";
import type { TurnScript, TurnStep } from "./turn-script.ts";

export type FakeAgentOptions = {
	// Multiplies every step's delay; 0 plays a turn without waiting, for
	// tests.
	delayScale?: number;
};

const scripts: readonly TurnScript[] = [editTurn, markdownTurn, failingTurn];

// A prompt that is a script's slash command plays that script.
const scriptFor = (prompt: PromptRequest["prompt"]): TurnScript => {
	const [first] = prompt;
	const text = first?.type === "text" ? first.text.trim() : "";
	return scripts.find(({ name }) => text === `/${name}`) ?? editTurn;
};

type Choice = { value: string; name: string };

const select = (
	id: string,
	name: string,
	category: string,
	currentValue: string,
	options: Choice[],
): SessionConfigOption => ({
	id,
	name,
	category,
	type: "select",
	currentValue,
	options,
});

type Config = { model: string; effort: string; mode: string };

// The options a real agent reports, so pickers have something to show. As
// with real agents, the effort levels depend on the model: the small one has
// none.
const configOptions = ({
	model,
	effort,
	mode,
}: Config): SessionConfigOption[] => [
	select("model", "Model", "model", model, [
		{ value: "fake-large", name: "Fake Large" },
		{ value: "fake-small", name: "Fake Small" },
	]),
	...(model === "fake-small"
		? []
		: [
				select("effort", "Effort", "thought_level", effort, [
					{ value: "low", name: "Low" },
					{ value: "medium", name: "Medium" },
					{ value: "high", name: "High" },
				]),
			]),
	select("mode", "Mode", "mode", mode, [
		{ value: "default", name: "Ask first" },
		{ value: "plan", name: "Plan" },
	]),
];

const isConfigId = (config: Config, id: string): id is keyof Config =>
	Object.hasOwn(config, id);

class Cancelled extends Error {}

const wait = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			reject(new Cancelled());
			return;
		}
		if (ms === 0) {
			resolve();
			return;
		}
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", stop);
			resolve();
		}, ms);
		const stop = () => {
			clearTimeout(timer);
			reject(new Cancelled());
		};
		signal.addEventListener("abort", stop, { once: true });
	});

// An ACP agent that replays scripted turns (docs/spec/05-agents-chat.md):
// no model, no login, no cost. It offers each script as a slash command.
export const createFakeAgent = ({
	delayScale = 1,
}: FakeAgentOptions = {}): AgentApp => {
	// The turn each session is playing, so `session/cancel` can stop it.
	const turns = new Map<string, AbortController>();
	let capabilities: ClientCapabilities = {};
	const configs = new Map<string, Config>();

	const play = async (
		client: AgentContext,
		sessionId: string,
		step: TurnStep,
		signal: AbortSignal,
	) => {
		await wait(step.after * delayScale, signal);
		if ("update" in step) {
			await client.notify("session/update", { sessionId, update: step.update });
		} else if ("permission" in step) {
			await client.request("session/request_permission", {
				sessionId,
				...step.permission,
			});
		} else if ("question" in step) {
			// A real agent skips the question when the client cannot show forms.
			if (capabilities.elicitation?.form == null) return;
			await client.request("elicitation/create", {
				mode: "form",
				sessionId,
				message: step.question.message,
				requestedSchema: step.question.schema,
			});
		} else {
			// As real agents report a failed turn.
			throw RequestError.internalError(undefined, step.fail);
		}
		if (signal.aborted) throw new Cancelled();
	};

	const prompt = async (
		client: AgentContext,
		{ sessionId, prompt }: PromptRequest,
	): Promise<PromptResponse> => {
		turns.get(sessionId)?.abort();
		const turn = new AbortController();
		turns.set(sessionId, turn);
		const script = scriptFor(prompt);
		try {
			for (const step of script.steps) {
				await play(client, sessionId, step, turn.signal);
			}
			return {
				stopReason: script.stop.reason,
				usage: script.stop.usage ?? null,
			};
		} catch (error) {
			if (error instanceof Cancelled) return { stopReason: "cancelled" };
			throw error;
		} finally {
			if (turns.get(sessionId) === turn) turns.delete(sessionId);
		}
	};

	// A session opening: its options, after the commands it offers.
	const open = async (client: AgentContext, sessionId: string) => {
		const config = configs.get(sessionId) ?? {
			model: "fake-large",
			effort: "medium",
			mode: "default",
		};
		configs.set(sessionId, config);
		await client.notify("session/update", {
			sessionId,
			update: {
				sessionUpdate: "available_commands_update",
				availableCommands: scripts.map(({ name, description }) => ({
					name,
					description,
				})),
			},
		});
		return configOptions(config);
	};

	return (
		agent({ name: "yaa-fake-agent" })
			.onRequest("initialize", ({ params }) => {
				capabilities = params.clientCapabilities ?? {};
				return {
					protocolVersion: PROTOCOL_VERSION,
					agentCapabilities: {
						promptCapabilities: { image: true },
						sessionCapabilities: { resume: {} },
					},
					agentInfo: {
						name: "yaa-fake-agent",
						title: "Fake agent",
						version: "0.0.0",
					},
				};
			})
			.onRequest("session/new", async ({ client }) => {
				const sessionId = randomUUID();
				return { sessionId, configOptions: await open(client, sessionId) };
			})
			// It keeps no context, so any session resumes, with the options it had
			// in this process or the defaults.
			.onRequest("session/resume", async ({ client, params }) => ({
				configOptions: await open(client, params.sessionId),
			}))
			.onRequest("session/set_config_option", ({ params }) => {
				const { sessionId, configId, value } = params;
				const config = configs.get(sessionId);
				if (
					config === undefined ||
					!isConfigId(config, configId) ||
					typeof value !== "string"
				) {
					throw RequestError.invalidParams(undefined, `No option ${configId}`);
				}
				config[configId] = value;
				return { configOptions: configOptions(config) };
			})
			.onRequest("session/prompt", ({ client, params }) =>
				prompt(client, params),
			)
			.onNotification("session/cancel", ({ params }) => {
				turns.get(params.sessionId)?.abort();
			})
	);
};

// A connection to a fake agent in this process, for tests: two in-memory
// pipes, one each way, carrying the same newline-delimited JSON as stdio.
export const connectFakeAgent = (options: FakeAgentOptions = {}): Stream => {
	const toAgent = new TransformStream<Uint8Array, Uint8Array>();
	const toClient = new TransformStream<Uint8Array, Uint8Array>();
	createFakeAgent(options).connect(
		ndJsonStream(toClient.writable, toAgent.readable),
	);
	return ndJsonStream(toAgent.writable, toClient.readable);
};
