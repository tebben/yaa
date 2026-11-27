import type { PluginProvider } from "@yaa/contracts/plugin-manifest";
import type { Disposable } from "@yaa/contracts/protocol";
import type { PanelAgents } from "@yaa/plugin-api/ui";
import type { CoreClient } from "../core-connection.ts";

type PanelAgentsOptions = {
	client: CoreClient;
	worktree: string;
	providers: Promise<readonly PluginProvider[]>;
	// Disposes what the panel leaves registered when it closes.
	track(disposable: Disposable): Disposable;
};

// One panel's access to its worktree's agent sessions.
export const createPanelAgents = ({
	client,
	worktree,
	providers,
	track,
}: PanelAgentsOptions): PanelAgents => ({
	providers: () => providers,
	status: (provider) => client.request("providers.status", { provider }),
	subscribe(listener, failed) {
		// How many events of each session the panel has had; undefined until
		// the history is read. Core answers in order with its events, so one
		// that arrives before the history is in it.
		let had: Map<string, number> | undefined;
		let disposed = false;
		const live = client.subscribe("agent.event", (sent) => {
			if (had === undefined || sent.worktree !== worktree) return;
			const { sessionId, provider, seq, event } = sent;
			if (seq !== (had.get(sessionId) ?? 0)) return;
			had.set(sessionId, seq + 1);
			listener([{ sessionId, provider, events: [event] }]);
		});
		client.request("agent.sessions", {}).then(({ sessions }) => {
			if (disposed) return;
			const history = sessions.filter(
				(session) => session.worktree === worktree,
			);
			had = new Map(
				history.map(({ sessionId, events }) => [sessionId, events.length]),
			);
			listener(history);
		}, failed);
		return track({
			dispose() {
				disposed = true;
				live.dispose();
			},
		});
	},
	async start(provider) {
		const { sessionId } = await client.request("agent.start", {
			worktree,
			provider,
		});
		return sessionId;
	},
	async prompt(sessionId, text, attachments) {
		await client.request("agent.prompt", {
			sessionId,
			text,
			attachments: [...attachments],
		});
	},
	async cancel(sessionId) {
		await client.request("agent.cancel", { sessionId });
	},
	async restart(sessionId) {
		await client.request("agent.restart", { sessionId });
	},
	async setConfig(sessionId, configId, value) {
		await client.request("agent.setConfig", { sessionId, configId, value });
	},
	async answerPermission(sessionId, requestId, optionId) {
		await client.request("agent.answerPermission", {
			sessionId,
			requestId,
			optionId,
		});
	},
	async answerQuestion(sessionId, requestId, answer) {
		await client.request("agent.answerQuestion", {
			sessionId,
			requestId,
			answer,
		});
	},
});
