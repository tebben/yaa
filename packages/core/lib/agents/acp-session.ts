import {
	type AuthMethod,
	type CreateElicitationResponse,
	client,
	type NewSessionRequest,
	PROTOCOL_VERSION,
	RequestError,
	type RequestPermissionResponse,
	type SessionConfigOption,
	type Stream,
} from "@agentclientprotocol/sdk/unstable";
import type {
	AgentEvent,
	PromptAttachment,
	QuestionAnswer,
} from "@yaa/contracts/agent-events";
import type { Logger } from "@yaa/contracts/log";
import { normalizeQuestion } from "./normalize-question.ts";
import {
	configEvent,
	normalizeUpdate,
	turnTokens,
} from "./normalize-update.ts";
import { promptContent } from "./prompt-content.ts";

export type AgentConnection = {
	// The agent's stdio, or an in-process agent in tests.
	stream: Stream;
	// Resolves when the agent is gone, with how it ended.
	exited: Promise<string>;
};

export type AcpSessionOptions = {
	agent: AgentConnection;
	cwd: string;
	// The agent's id of a session to resume instead of starting one.
	resume?: string;
	// Sent as `_meta` with the request that opens or resumes the session,
	// from the provider.
	meta?: Record<string, unknown> | undefined;
	log: Logger;
	emit(event: AgentEvent): void;
};

export type AcpSession = {
	// The agent's own id for the session.
	readonly id: string;
	// Starts a turn.
	prompt(text: string, attachments: readonly PromptAttachment[]): void;
	setConfig(configId: string, value: string): Promise<void>;
	cancel(): void;
	answerPermission(requestId: string, optionId: string): void;
	answerQuestion(requestId: string, answer: QuestionAnswer): void;
	close(): void;
};

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// ACP's error for a session the agent opens only once the user signs in.
const AUTH_REQUIRED = -32000;

// Says how to sign in, in the words of the methods the agent offers, such as
// Copilot CLI's "Run `copilot login` in the terminal".
const signInNeeded = (methods: readonly AuthMethod[]) =>
	new Error(
		[
			"The agent needs you to sign in.",
			...methods.map(({ name, description }) => description ?? name),
		].join(" "),
	);

const elicitationResponse = (
	answer: QuestionAnswer,
): CreateElicitationResponse =>
	answer.action === "accept"
		? { action: "accept", content: answer.values }
		: { action: answer.action };

// One agent session over ACP (docs/spec/05-agents-chat.md). Core holds the
// connection; every update, request and turn outcome leaves as a normalized
// event. A permission request or question waits until it is answered or the
// turn is cancelled.
export const openAcpSession = async ({
	agent: { stream, exited },
	cwd,
	resume,
	meta,
	log,
	emit,
}: AcpSessionOptions): Promise<AcpSession> => {
	// What every request that opens or resumes a session says.
	const setup: NewSessionRequest = { cwd, mcpServers: [] };
	if (meta !== undefined) setup._meta = meta;
	const permissions = new Map<
		string,
		(response: RequestPermissionResponse) => void
	>();
	const questions = new Map<
		string,
		(response: CreateElicitationResponse) => void
	>();
	let nextRequest = 0;
	let running = false;
	// While `session/load` replays the history, which the chat has already.
	let replaying = false;

	// Answers a waiting request once, and says so with its `.resolved` event.
	const waitFor = <R>(
		pending: Map<string, (response: R) => void>,
		ask: (requestId: string) => void,
		resolved: (requestId: string, response: R) => AgentEvent,
	) =>
		new Promise<R>((resolve) => {
			const requestId = String(nextRequest++);
			pending.set(requestId, (response) => {
				pending.delete(requestId);
				emit(resolved(requestId, response));
				resolve(response);
			});
			ask(requestId);
		});

	const answer = <R>(
		pending: Map<string, (response: R) => void>,
		requestId: string,
		response: R,
	) => {
		const resolve = pending.get(requestId);
		if (resolve === undefined) throw new Error(`No request ${requestId}`);
		resolve(response);
	};

	const app = client({ name: "yaa" })
		.onNotification("session/update", ({ params }) => {
			if (replaying) return;
			const event = normalizeUpdate(params.update);
			if (event === undefined) {
				log.debug("agent update not used", {
					update: params.update.sessionUpdate,
				});
			} else emit(event);
		})
		.onRequest("session/request_permission", ({ params }) =>
			waitFor(
				permissions,
				(requestId) =>
					emit({
						type: "permission",
						requestId,
						toolCallId: params.toolCall.toolCallId,
						title: params.toolCall.title ?? undefined,
						options: params.options.map(({ optionId, name, kind }) => ({
							optionId,
							name,
							kind,
						})),
					}),
				(requestId, { outcome }) => ({
					type: "permission.resolved",
					requestId,
					optionId: outcome.outcome === "selected" ? outcome.optionId : null,
				}),
			),
		)
		.onRequest("elicitation/create", ({ params }) => {
			if (params.mode !== "form" || !("requestedSchema" in params)) {
				log.warn("agent question not shown", { mode: params.mode });
				return { action: "decline" };
			}
			const { fields, unsupported } = normalizeQuestion(params.requestedSchema);
			if (unsupported.length > 0) {
				log.warn("agent question fields not shown", { unsupported });
			}
			return waitFor(
				questions,
				(requestId) =>
					emit({
						type: "question",
						requestId,
						message: params.message,
						fields,
					}),
				(requestId, { action }) => ({
					type: "question.resolved",
					requestId,
					action:
						action === "accept" || action === "decline" ? action : "cancel",
				}),
			);
		});

	const connection = app.connect(stream);
	const { agent } = connection;
	const open = async (): Promise<{
		sessionId: string;
		configOptions?: SessionConfigOption[] | null;
		images: boolean;
	}> => {
		const { agentCapabilities, authMethods = [] } = await agent.request(
			"initialize",
			{
				protocolVersion: PROTOCOL_VERSION,
				clientCapabilities: { elicitation: { form: {} } },
				clientInfo: { name: "yaa", version: "0.0.0" },
			},
		);
		// A session refused for want of a sign-in fails with how to sign in.
		const explained = (error: unknown): never => {
			throw error instanceof RequestError && error.code === AUTH_REQUIRED
				? signInNeeded(authMethods)
				: error;
		};
		const images = agentCapabilities?.promptCapabilities?.image === true;
		if (resume === undefined) {
			const session = await agent
				.request("session/new", setup)
				.catch(explained);
			return { ...session, images };
		}
		// Resuming keeps the agent's context without replaying it; an agent that
		// can only load replays it, and the chat has it already
		// (docs/decisions/0014-acp-coverage.md).
		if (agentCapabilities?.sessionCapabilities?.resume != null) {
			const session = await agent
				.request("session/resume", { ...setup, sessionId: resume })
				.catch(explained);
			return { ...session, sessionId: resume, images };
		}
		if (agentCapabilities?.loadSession === true) {
			replaying = true;
			const session = await agent
				.request("session/load", { ...setup, sessionId: resume })
				.catch(explained)
				.finally(() => {
					replaying = false;
				});
			return { ...session, sessionId: resume, images };
		}
		throw new Error("The agent cannot resume a session: start a new chat");
	};
	const created = await open().catch(async (error: unknown) => {
		if (!connection.signal.aborted) throw error;
		// The connection closes before the process is seen to end, which says
		// why.
		throw new Error(`The agent ${await exited}`);
	});
	const { sessionId, images } = created;
	emit({ type: "capabilities", images });
	if (created.configOptions != null) emit(configEvent(created.configOptions));

	const cancelPending = () => {
		for (const resolve of permissions.values()) {
			resolve({ outcome: { outcome: "cancelled" } });
		}
		for (const resolve of questions.values()) resolve({ action: "cancel" });
	};

	let closed = false;
	let gone = false;
	// An agent that ends while its session is open has crashed, whether or not
	// a turn was running.
	void exited.then((reason) => {
		if (closed) return;
		gone = true;
		running = false;
		cancelPending();
		emit({ type: "error", message: `The agent ${reason}` });
	});

	return {
		id: sessionId,
		prompt(text, attachments) {
			if (gone) throw new Error("The agent has exited");
			if (running) throw new Error("A turn is already running");
			const { blocks, sent } = promptContent(text, attachments, { images });
			running = true;
			emit({ type: "prompt", text, attachments: sent });
			agent
				.request("session/prompt", { sessionId, prompt: blocks })
				.then(
					({ stopReason, usage }) =>
						emit({ type: "turn.end", stopReason, tokens: turnTokens(usage) }),
					(error: unknown) => {
						if (connection.signal.aborted) return;
						emit({ type: "error", message: describe(error) });
					},
				)
				.finally(() => {
					running = false;
				});
		},
		async setConfig(configId, value) {
			if (gone) throw new Error("The agent has exited");
			const { configOptions } = await agent.request(
				"session/set_config_option",
				{ sessionId, configId, value },
			);
			emit(configEvent(configOptions));
		},
		// ACP has the client answer what is still waiting as cancelled.
		cancel() {
			cancelPending();
			void agent.notify("session/cancel", { sessionId });
		},
		answerPermission(requestId, optionId) {
			answer(permissions, requestId, {
				outcome: { outcome: "selected", optionId },
			});
		},
		answerQuestion(requestId, response) {
			answer(questions, requestId, elicitationResponse(response));
		},
		close() {
			closed = true;
			cancelPending();
			connection.close();
		},
	};
};
