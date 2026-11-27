import {
	type ContextKind,
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
	loaded: { mcpServers: string[]; skills: string[] };
};

const TOGGLING = {
	mcpServers: "mcp-toggling",
	skills: "skill-toggling",
} as const satisfies Record<ContextKind, ProviderCapability>;

// An item the agent's own configuration leaves out is neither loaded nor
// switched off. One the provider cannot switch off stays loaded.
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
		// Named twice, as at user and project level: off wins, as the agent
		// leaves out every item of that name.
		for (const name of off) loaded.delete(name);
		return { loaded: [...loaded], off: [...off] };
	};
	const mcpServers = split("mcpServers");
	const skills = split("skills");
	return {
		off: { mcpServers: mcpServers.off, skills: skills.off },
		loaded: { mcpServers: mcpServers.loaded, skills: skills.loaded },
	};
};
