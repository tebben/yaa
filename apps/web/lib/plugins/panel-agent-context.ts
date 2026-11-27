import type { Disposable } from "@yaa/contracts/protocol";
import type {
	PanelAgentContext,
	WorktreeAgentContext,
} from "@yaa/plugin-api/ui";
import type { CoreConnection } from "../core-connection.ts";

type PanelAgentContextOptions = {
	core: CoreConnection;
	worktree: string;
	// Disposes what the panel leaves registered when it closes.
	track(disposable: Disposable): Disposable;
};

// One panel's view of its worktree's MCP servers and skills.
export const createPanelAgentContext = ({
	core: { client, onRestart },
	worktree,
	track,
}: PanelAgentContextOptions): PanelAgentContext => ({
	watch(listener, failed) {
		let read: Partial<WorktreeAgentContext> = {};
		let disposed = false;
		const take = (part: Partial<WorktreeAgentContext>) => {
			if (disposed) return;
			read = { ...read, ...part };
			const { providers, toggles } = read;
			if (providers !== undefined && toggles !== undefined) {
				listener({ providers, toggles });
			}
		};
		const readToggles = () => {
			client
				.request("context.toggles", { worktree })
				.then((toggles) => take({ toggles }), failed);
		};
		const readProviders = () => {
			client
				.request("context.discover", { worktree })
				.then(({ providers }) => take({ providers }), failed);
		};
		const readAll = () => {
			readToggles();
			readProviders();
		};
		const live = client.subscribe("context.changed", readToggles);
		const restart = onRestart(readAll);
		readAll();
		const { dispose } = track({
			dispose() {
				disposed = true;
				live.dispose();
				restart.dispose();
			},
		});
		return { dispose, refresh: readProviders };
	},
	async set(change) {
		await client.request("context.set", { worktree, ...change });
	},
});
