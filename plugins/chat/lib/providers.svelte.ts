import type { PluginProvider } from "@yaa/contracts/plugin-manifest";
import type { ProviderStatus } from "@yaa/contracts/providers";
import type { PanelAgents } from "@yaa/plugin-api/ui";

// The agent providers and whether a chat can start with each, as core last
// said.
export const createProviders = (
	agents: PanelAgents,
	failed: (reason: unknown) => void,
) => {
	let listed = $state.raw<readonly PluginProvider[]>([]);
	// A provider without a status is being checked, or its check failed.
	let statuses = $state.raw<ReadonlyMap<string, ProviderStatus>>(new Map());
	let checking = $state.raw<ReadonlySet<string>>(new Set());

	const check = (provider: string) => {
		if (checking.has(provider)) return;
		checking = new Set(checking).add(provider);
		agents
			.status(provider)
			.then((status) => {
				statuses = new Map(statuses).set(provider, status);
			}, failed)
			.finally(() => {
				checking = new Set([...checking].filter((id) => id !== provider));
			});
	};
	const contributed = agents.providers();
	contributed.then((providers) => {
		listed = providers;
	}, failed);

	return {
		get listed() {
			return listed;
		},
		title: (provider: string) =>
			listed.find(({ id }) => id === provider)?.title ?? provider,
		// How the provider applies the worktree's permission mode, if it does.
		permissionModes: (provider: string) =>
			listed.find(({ id }) => id === provider)?.permissionModes,
		status: (provider: string) => statuses.get(provider),
		checking: (provider: string) => checking.has(provider),
		check,
		// Asks every provider again, as when its list comes on screen.
		checkAll() {
			contributed.then((providers) => {
				for (const { id } of providers) check(id);
			}, failed);
		},
	};
};

export type Providers = ReturnType<typeof createProviders>;
