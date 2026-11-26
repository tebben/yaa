import type { AgentEvent, QuestionAnswer } from "@yaa/contracts/agent-events";
import type { PluginProvider } from "@yaa/contracts/plugin-manifest";
import { createContext } from "svelte";
import type { CoreClient } from "../core-connection.ts";
import { createProviders } from "./providers.svelte.ts";

type AgentChatOptions = {
	client: CoreClient;
	report(message: string): void;
	// The providers the loaded plugins contribute.
	providers: Promise<PluginProvider[]>;
};

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The agent sessions core holds, as the placeholder chat shows them: the
// history read once, then each event as it arrives. Core numbers a
// session's events, so one that arrives before the history, or twice, is
// placed by its number (docs/spec/05-agents-chat.md).
export const createAgentChat = ({
	client,
	report,
	providers: contributed,
}: AgentChatOptions) => {
	let sessions = $state.raw<ReadonlyMap<string, readonly AgentEvent[]>>(
		new Map(),
	);
	// The session each worktree's chat shows: the one it started, or the
	// latest.
	let shown = $state.raw<ReadonlyMap<string, string>>(new Map());
	// The provider of each session.
	let providerOf = $state.raw<ReadonlyMap<string, string>>(new Map());

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
		providerOf = new Map([
			...providerOf,
			...history.map(
				({ sessionId, provider }) => [sessionId, provider] as const,
			),
		]);
		shown = new Map([
			...history.map(
				({ worktree, sessionId }) => [worktree, sessionId] as const,
			),
			...shown,
		]);
	}, fail);

	const providers = createProviders({ client, contributed, fail });

	return {
		providers,
		// The chat of one worktree.
		in(worktree: string) {
			// Sends to the session shown.
			const send = (action: (sessionId: string) => Promise<unknown>) => {
				const sessionId = shown.get(worktree);
				if (sessionId !== undefined) action(sessionId).catch(fail);
			};

			return {
				get started() {
					return shown.has(worktree);
				},
				// The title of the shown session's provider.
				get provider() {
					const id = providerOf.get(shown.get(worktree) ?? "");
					return providers.listed.find((provider) => provider.id === id)?.title;
				},
				get events(): readonly AgentEvent[] {
					return sessions.get(shown.get(worktree) ?? "") ?? [];
				},
				start(provider: string) {
					client
						.request("agent.start", { worktree, provider })
						.then(({ sessionId }) => {
							providerOf = new Map(providerOf).set(sessionId, provider);
							shown = new Map(shown).set(worktree, sessionId);
						}, fail);
				},
				prompt(text: string) {
					send((sessionId) =>
						client.request("agent.prompt", { sessionId, text }),
					);
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
		},
	};
};

export type AgentChat = ReturnType<typeof createAgentChat>;

// App-wide, so it reaches the chat panel in its dock slot. A getter, as
// App's props are read in closures.
export const [getAgentChat, setAgentChat] = createContext<() => AgentChat>();
