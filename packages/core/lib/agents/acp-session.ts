import {
	type CreateElicitationResponse,
	client,
	PROTOCOL_VERSION,
	type RequestPermissionResponse,
	type Stream,
} from "@agentclientprotocol/sdk/unstable";
import type { AgentEvent, QuestionAnswer } from "@yaa/contracts/agent-events";
import type { Logger } from "@yaa/contracts/log";
import { normalizeQuestion } from "./normalize-question.ts";
import {
	configEvent,
	normalizeUpdate,
	turnTokens,
} from "./normalize-update.ts";

export type AcpSessionOptions = {
	// The connection to the agent: its stdio, or an in-process agent in tests.
	stream: Stream;
	cwd: string;
	log: Logger;
	emit(event: AgentEvent): void;
};

export type AcpSession = {
	prompt(text: string): void;
	cancel(): void;
	answerPermission(requestId: string, optionId: string): void;
	answerQuestion(requestId: string, answer: QuestionAnswer): void;
	close(): void;
};

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

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
	stream,
	cwd,
	log,
	emit,
}: AcpSessionOptions): Promise<AcpSession> => {
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
	await agent.request("initialize", {
		protocolVersion: PROTOCOL_VERSION,
		clientCapabilities: { elicitation: { form: {} } },
		clientInfo: { name: "yaa", version: "0.0.0" },
	});
	const created = await agent.request("session/new", { cwd, mcpServers: [] });
	const { sessionId } = created;
	if (created.configOptions != null) emit(configEvent(created.configOptions));

	const cancelPending = () => {
		for (const resolve of permissions.values()) {
			resolve({ outcome: { outcome: "cancelled" } });
		}
		for (const resolve of questions.values()) resolve({ action: "cancel" });
	};

	void connection.closed.then(() => {
		cancelPending();
		if (running) emit({ type: "error", message: "The agent exited" });
		running = false;
	});

	return {
		prompt(text) {
			if (running) throw new Error("A turn is already running");
			running = true;
			emit({ type: "prompt", text });
			agent
				.request("session/prompt", {
					sessionId,
					prompt: [{ type: "text", text }],
				})
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
			connection.close();
		},
	};
};
