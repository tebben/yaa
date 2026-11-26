import type { PluginProvider } from "@yaa/contracts/plugin-manifest";
import type { ProviderStatus } from "@yaa/contracts/providers";
import type { CoreClient } from "../core-connection.ts";

type ProvidersOptions = {
	client: CoreClient;
	contributed: Promise<PluginProvider[]>;
	fail(reason: unknown): void;
};

// The agent providers and whether a chat can start with each, as core last
// said.
export const createProviders = ({
	client,
	contributed,
	fail,
}: ProvidersOptions) => {
	let listed = $state.raw<readonly PluginProvider[]>([]);
	// A provider without a status is being checked, or its check failed.
	let statuses = $state.raw<ReadonlyMap<string, ProviderStatus>>(new Map());
	let checking = $state.raw<ReadonlySet<string>>(new Set());

	const check = (provider: string) => {
		if (checking.has(provider)) return;
		checking = new Set(checking).add(provider);
		client
			.request("providers.status", { provider })
			.then((status) => {
				statuses = new Map(statuses).set(provider, status);
			}, fail)
			.finally(() => {
				checking = new Set([...checking].filter((id) => id !== provider));
			});
	};
	contributed.then((providers) => {
		listed = providers;
	}, fail);

	return {
		get listed() {
			return listed;
		},
		status: (provider: string) => statuses.get(provider),
		checking: (provider: string) => checking.has(provider),
		check,
		// Asks every provider again, as when its list comes on screen.
		async checkAll() {
			for (const { id } of await contributed) check(id);
		},
	};
};

export type Providers = ReturnType<typeof createProviders>;
