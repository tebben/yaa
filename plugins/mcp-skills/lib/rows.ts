import {
	type ContextKind,
	type ContextLayer,
	type LayeredToggles,
	NO_TOGGLES,
	type ProviderDiscovery,
	resolveToggle,
} from "@yaa/contracts/agent-context";
import type { PluginProvider } from "@yaa/contracts/plugin-manifest";
import type {
	ContextLevel,
	ProviderCapability,
} from "@yaa/contracts/providers";

// The layers, the most specific first, as the panel offers them.
export const LAYER_CHOICES: readonly { value: ContextLayer; label: string }[] =
	[
		{ value: "worktree", label: "Worktree" },
		{ value: "project", label: "Project" },
		{ value: "app", label: "Global" },
	];

export type ListedProvider = Pick<
	PluginProvider,
	"id" | "title" | "capabilities"
>;

// One name, whichever providers find it.
export type Row = {
	name: string;
	description: string | undefined;
	// The levels it was found at, and where.
	levels: ContextLevel[];
	sources: string[];
	// The providers whose agent would load it.
	providers: string[];
	// Whether it is on, as seen from the layer shown.
	enabled: boolean;
	// The layer that says so, undefined when none does.
	from: ContextLayer | undefined;
	// Set at the layer shown, which can then stop setting it.
	setHere: boolean;
	// A more specific layer of this worktree that says otherwise.
	overriddenBy: ContextLayer | undefined;
	// Whether switching it does anything for one of its providers.
	switchable: boolean;
	// Those of its providers that load it all the same.
	keptBy: string[];
	// Left out by the agents' own configuration.
	unavailable: boolean;
};

export type ToggleList = {
	rows: Row[];
	// How many of the rows an agent would load.
	on: number;
	// Whether the whole list can be switched, and whether the layer shown sets
	// anything in it.
	switchable: boolean;
	setHere: boolean;
};

const TOGGLING = {
	mcpServers: "mcp-toggling",
	skills: "skill-toggling",
} as const satisfies Record<ContextKind, ProviderCapability>;

// What applies at a layer: the more specific ones say nothing there.
const seenFrom = (
	toggles: LayeredToggles,
	layer: ContextLayer,
): LayeredToggles => ({
	app: toggles.app,
	project: layer === "app" ? NO_TOGGLES : toggles.project,
	worktree: layer === "worktree" ? toggles.worktree : NO_TOGGLES,
});

const unique = <T>(values: readonly T[]) => [...new Set(values)];

export const toggleList = (
	kind: ContextKind,
	found: readonly ProviderDiscovery[],
	providers: readonly ListedProvider[],
	toggles: LayeredToggles,
	layer: ContextLayer,
): ToggleList => {
	const finds = found.flatMap((result) => {
		if (!result.found) return [];
		const provider = providers.find(({ id }) => id === result.provider);
		if (provider === undefined) return [];
		return result.discovery[kind].map((item) => ({ item, provider }));
	});
	const byName = Map.groupBy(finds, ({ item }) => item.name);
	const seen = seenFrom(toggles, layer);
	const rows = [...byName].map(([name, all]): Row => {
		const active = all.filter(({ item }) => item.active);
		const loading = unique(active.map(({ provider }) => provider));
		const toggling = loading.filter(({ capabilities }) =>
			capabilities.includes(TOGGLING[kind]),
		);
		const here = resolveToggle(seen, kind, name);
		const effective = resolveToggle(toggles, kind, name);
		return {
			name,
			description: all.find(({ item }) => item.description)?.item.description,
			levels: unique(all.map(({ item }) => item.level)),
			sources: unique(all.map(({ item }) => item.source)),
			providers: unique(all.map(({ provider }) => provider.title)),
			enabled: here.enabled,
			from: here.layer,
			setHere: toggles[layer][kind].items[name] !== undefined,
			overriddenBy:
				effective.enabled === here.enabled ? undefined : effective.layer,
			switchable: toggling.length > 0,
			keptBy: loading
				.filter((provider) => !toggling.includes(provider))
				.map(({ title }) => title),
			unavailable: active.length === 0,
		};
	});
	rows.sort((a, b) => a.name.localeCompare(b.name));
	const list = toggles[layer][kind];
	return {
		rows,
		on: rows.filter(
			(row) =>
				!row.unavailable &&
				(row.enabled || !row.switchable || row.keptBy.length > 0),
		).length,
		switchable: rows.some((row) => row.switchable),
		setHere: list.all !== undefined || Object.keys(list.items).length > 0,
	};
};
