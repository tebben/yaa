import type { AgentEvent, QuestionAnswer } from "@yaa/contracts/agent-events";
import { createContext } from "svelte";
import type { CoreClient } from "../core-connection.ts";
import { foldTranscript } from "./transcript.ts";

type AgentChatOptions = {
	client: CoreClient;
	report(message: string): void;
};

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The agent sessions core holds, as the placeholder chat shows them: the
// history read once, then each event as it arrives. Core numbers a
// session's events, so one that arrives before the history, or twice, is
// placed by its number (docs/spec/05-agents-chat.md).
export const createAgentChat = ({ client, report }: AgentChatOptions) => {
	let sessions = $state.raw<ReadonlyMap<string, readonly AgentEvent[]>>(
		new Map(),
	);
	// The session the chat shows: the one it started, or the latest.
	let current = $state<string>();
	const transcript = $derived(
		foldTranscript((current && sessions.get(current)) || []),
	);

	const fail = (reason: unknown) => report(`Agent: ${describe(reason)}`);

	client.subscribe("agent.event", ({ sessionId, seq, event }) => {
		const events = sessions.get(sessionId) ?? [];
		if (seq !== events.length) return;
		sessions = new Map(sessions).set(sessionId, [...events, event]);
	});
	client.request("agent.sessions", {}).then(({ sessions: history }) => {
		const next = new Map(sessions);
		for (const { sessionId, events } of history) {
			if (events.length > (next.get(sessionId)?.length ?? 0)) {
				next.set(sessionId, events);
			}
		}
		sessions = next;
		current ??= history.at(-1)?.sessionId;
	}, fail);

	// Sends to the current session.
	const send = (action: (sessionId: string) => Promise<unknown>) => {
		if (current !== undefined) action(current).catch(fail);
	};

	return {
		get started() {
			return current !== undefined;
		},
		get transcript() {
			return transcript;
		},
		start() {
			client.request("agent.start", {}).then(({ sessionId }) => {
				current = sessionId;
			}, fail);
		},
		prompt(text: string) {
			send((sessionId) => client.request("agent.prompt", { sessionId, text }));
		},
		cancel() {
			send((sessionId) => client.request("agent.cancel", { sessionId }));
		},
		answerPermission(requestId: string, optionId: string) {
			send((sessionId) =>
				client.request("agent.answerPermission", {
					sessionId,
					requestId,
					optionId,
				}),
			);
		},
		answerQuestion(requestId: string, answer: QuestionAnswer) {
			send((sessionId) =>
				client.request("agent.answerQuestion", {
					sessionId,
					requestId,
					answer,
				}),
			);
		},
	};
};

export type AgentChat = ReturnType<typeof createAgentChat>;

// App-wide, so it reaches the chat panel in its dock slot. A getter, as
// App's props are read in closures.
export const [getAgentChat, setAgentChat] = createContext<() => AgentChat>();
