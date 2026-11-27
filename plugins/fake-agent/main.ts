// The fake agent as a provider, in dev mode only: always there, with no
// sign-in (docs/spec/05-agents-chat.md).
import type { DiscoveredItem, PluginBackend } from "@yaa/plugin-api";

const item = (
	name: string,
	level: DiscoveredItem["level"],
	active = true,
): DiscoveredItem => ({ name, level, source: "built into yaa", active });

export const activate: PluginBackend["activate"] = ({ providers }) => {
	providers.register("fake-agent", {
		detect: async () => ({ installed: true, version: "0.0.0" }),
		authStatus: async () => ({ state: "signed-in" }),
		spawn: async () => ({ run: "module" }),
		// A fixed list, for the panel to have something to switch.
		discover: async () => ({
			mcpServers: [
				item("fake-docs", "user"),
				item("fake-tracker", "worktree"),
				item("fake-unapproved", "project", false),
			],
			skills: [item("fake-review", "user"), item("fake-release", "worktree")],
		}),
	});
};
