import * as z from "zod";
import { discovery } from "./providers.ts";

// Which MCP servers and skills yaa switches off, set per layer
// (docs/spec/09-mcp-skills.md). Pure, so core applies the same rule the
// panel shows.

export const contextKind = z.enum(["mcpServers", "skills"]);

// The app's default, the project's, and the worktree's own.
export const contextLayer = z.enum(["app", "project", "worktree"]);

// One list at one layer: `all` switches every item, `items` one by name,
// which wins over `all`. What a layer leaves unset it takes from the one
// below.
const toggleList = z.object({
	all: z.boolean().optional(),
	items: z.record(z.string(), z.boolean()),
});

export const contextToggles = z.object({
	mcpServers: toggleList,
	skills: toggleList,
});

export const layeredToggles = z.object({
	app: contextToggles,
	project: contextToggles,
	worktree: contextToggles,
});

// What each provider that lists them finds for a worktree.
export const providerDiscovery = z.discriminatedUnion("found", [
	z.object({ provider: z.string(), found: z.literal(true), discovery }),
	z.object({
		provider: z.string(),
		found: z.literal(false),
		problem: z.string(),
	}),
]);

export type ContextKind = z.infer<typeof contextKind>;
export type ContextLayer = z.infer<typeof contextLayer>;
export type ContextToggles = z.infer<typeof contextToggles>;
export type LayeredToggles = z.infer<typeof layeredToggles>;
export type ProviderDiscovery = z.infer<typeof providerDiscovery>;

// The most specific first.
const LAYERS = ["worktree", "project", "app"] as const;

export const NO_TOGGLES: ContextToggles = {
	mcpServers: { items: {} },
	skills: { items: {} },
};

// Where an item's state comes from: the layer that sets it, or none, which
// leaves it on.
export type ToggleSource = {
	enabled: boolean;
	layer: ContextLayer | undefined;
};

export const resolveToggle = (
	toggles: LayeredToggles,
	kind: ContextKind,
	name: string,
): ToggleSource => {
	for (const layer of LAYERS) {
		const list = toggles[layer][kind];
		const enabled = list.items[name] ?? list.all;
		if (enabled !== undefined) return { enabled, layer };
	}
	return { enabled: true, layer: undefined };
};

// Sets one item, or with `name` undefined the whole list, at one layer;
// undefined `enabled` takes the setting off. Setting the whole list takes
// that layer's own items off, so the list is as set.
export const setToggle = (
	toggles: ContextToggles,
	kind: ContextKind,
	name: string | undefined,
	enabled: boolean | undefined,
): ContextToggles => {
	const list = toggles[kind];
	if (name === undefined) {
		return {
			...toggles,
			[kind]:
				enabled === undefined ? { items: {} } : { all: enabled, items: {} },
		};
	}
	const items = Object.fromEntries(
		Object.entries(list.items).filter(([key]) => key !== name),
	);
	return {
		...toggles,
		[kind]: {
			...list,
			items: enabled === undefined ? items : { ...items, [name]: enabled },
		},
	};
};
