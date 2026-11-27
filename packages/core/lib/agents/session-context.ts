import {
	type ContextKind,
	contextKind,
	type LayeredToggles,
	resolveToggle,
} from "@yaa/contracts/agent-context";
import type {
	Discovery,
	ProviderCapability,
	SwitchedOff,
} from "@yaa/contracts/providers";

// What a session opens with (docs/spec/09-mcp-skills.md): the names yaa
// switches off, for the provider to pass on, and those the agent then loads.
export type SessionContext = {
	off: SwitchedOff;
	// Undefined for a provider that lists nothing.
	loaded?: { mcpServers: string[]; skills: string[] };
};

export const UNLISTED: SessionContext = {
	off: { mcpServers: [], skills: [] },
};

const TOGGLING = {
	mcpServers: "mcp-toggling",
	skills: "skill-toggling",
} as const satisfies Record<ContextKind, ProviderCapability>;

// Whether a session may open with something switched off. When it cannot,
// its agent need not wait for what discovery finds.
export const maySwitchOff = (
	toggles: LayeredToggles,
	capabilities: readonly ProviderCapability[],
): boolean =>
	contextKind.options.some(
		(kind) =>
			capabilities.includes(TOGGLING[kind]) &&
			Object.values(toggles).some((layer) => {
				const { all, items } = layer[kind];
				return all === false || Object.values(items).includes(false);
			}),
	);

// An item the agent's own configuration leaves out is neither loaded nor
// switched off. One the provider cannot switch off stays loaded. A name
// found at two levels counts once.
export const sessionContext = (
	found: Discovery,
	toggles: LayeredToggles,
	capabilities: readonly ProviderCapability[],
): SessionContext => {
	const split = (kind: ContextKind) => {
		const toggling = capabilities.includes(TOGGLING[kind]);
		const loaded = new Set<string>();
		const off = new Set<string>();
		for (const { name, active } of found[kind]) {
			if (!active) continue;
			if (toggling && !resolveToggle(toggles, kind, name).enabled) {
				off.add(name);
			} else loaded.add(name);
		}
		return { loaded: [...loaded], off: [...off] };
	};
	const mcpServers = split("mcpServers");
	const skills = split("skills");
	return {
		off: { mcpServers: mcpServers.off, skills: skills.off },
		loaded: { mcpServers: mcpServers.loaded, skills: skills.loaded },
	};
};
