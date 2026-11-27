import type { DiscoveredItem, Discovery } from "@yaa/plugin-api";
import * as z from "zod";

// What `copilot mcp list --json` and `copilot skill list --json` print, as far
// as the provider reads them (Copilot CLI 1.0.116). The CLI leaves out a
// repository's servers while the user does not trust its folder.

const mcpList = z.object({
	mcpServers: z.record(
		z.string(),
		z.object({
			source: z.string(),
			sourcePath: z.string().optional(),
			sourcePlugin: z.string().optional(),
			enabled: z.boolean(),
		}),
	),
});

const skillList = z.array(
	z.object({
		name: z.string(),
		description: z.string().optional(),
		source: z.string(),
		path: z.string().optional(),
		enabled: z.boolean(),
	}),
);

// Files in the folder; everything else is the user's.
const WORKTREE_SOURCES = new Set(["workspace", "project"]);

const level = (source: string): DiscoveredItem["level"] =>
	WORKTREE_SOURCES.has(source) ? "worktree" : "user";

export const parseDiscovery = (printed: {
	mcpServers: string;
	skills: string;
}): Discovery => ({
	mcpServers: Object.entries(
		mcpList.parse(JSON.parse(printed.mcpServers)).mcpServers,
	).map(([name, { source, sourcePath, sourcePlugin, enabled }]) => ({
		name,
		level: level(source),
		source:
			sourcePath ??
			(sourcePlugin === undefined ? source : `plugin ${sourcePlugin}`),
		active: enabled,
	})),
	skills: skillList
		.parse(JSON.parse(printed.skills))
		.map(({ name, description, source, path, enabled }) => ({
			name,
			level: level(source),
			source: path ?? source,
			active: enabled,
			...(description === undefined ? {} : { description }),
		})),
});
