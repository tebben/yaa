import {
	type ContextKind,
	type ContextLayer,
	type LayeredToggles,
	type ProviderDiscovery,
	setToggle,
} from "@yaa/contracts/agent-context";
import type { PluginProvider } from "@yaa/contracts/plugin-manifest";
import type { Discovery } from "@yaa/contracts/providers";
import type { ContextScope, ContextStore } from "../storage/context-store.ts";
import { type SessionContext, sessionContext } from "./session-context.ts";

export type AgentContextOptions = {
	store: ContextStore;
	// A listed worktree's folder and project; throws for one that is gone.
	worktree(id: string): { path: string; project: string };
	// The providers the loaded plugins contribute.
	providers: readonly PluginProvider[];
	discover(provider: string, cwd: string): Promise<Discovery>;
};

export type ContextChange = {
	worktree: string;
	layer: ContextLayer;
	kind: ContextKind;
	name?: string | undefined;
	enabled?: boolean | undefined;
};

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The MCP servers and skills of each worktree's agents
// (docs/spec/09-mcp-skills.md): what the providers find, what the user
// switched off at each layer, and what a session opens with.
export const createAgentContext = ({
	store,
	worktree: listed,
	providers,
	discover,
}: AgentContextOptions) => {
	const listeners = new Set<() => void>();
	const listing = providers.filter(({ capabilities }) =>
		capabilities.includes("discovery"),
	);

	const scope = (worktree: string, layer: ContextLayer): ContextScope => {
		switch (layer) {
			case "app":
				return { layer };
			case "project":
				return { layer, project: listed(worktree).project };
			case "worktree":
				return { layer, worktree };
		}
	};

	const toggles = (worktree: string): LayeredToggles => ({
		app: store.get(scope(worktree, "app")),
		project: store.get(scope(worktree, "project")),
		worktree: store.get(scope(worktree, "worktree")),
	});

	return {
		toggles,
		set({ worktree, layer, kind, name, enabled }: ContextChange) {
			const at = scope(worktree, layer);
			store.set(at, setToggle(store.get(at), kind, name, enabled));
			for (const listener of listeners) listener();
		},
		onChange(listener: () => void) {
			listeners.add(listener);
		},
		// Each listing provider's finds; one that fails says why, and the
		// others still count.
		discover(worktree: string): Promise<ProviderDiscovery[]> {
			const { path } = listed(worktree);
			return Promise.all(
				listing.map(({ id: provider }) =>
					discover(provider, path).then(
						(discovery): ProviderDiscovery => ({
							provider,
							found: true,
							discovery,
						}),
						(error: unknown): ProviderDiscovery => ({
							provider,
							found: false,
							problem: describe(error),
						}),
					),
				),
			);
		},
		// Undefined for a provider that lists nothing, whose agent loads what
		// its configuration says.
		async forSession(
			worktree: string,
			provider: string,
		): Promise<SessionContext | undefined> {
			const declared = listing.find(({ id }) => id === provider);
			if (declared === undefined) return undefined;
			const found = await discover(provider, listed(worktree).path);
			return sessionContext(found, toggles(worktree), declared.capabilities);
		},
	};
};

export type AgentContext = ReturnType<typeof createAgentContext>;
