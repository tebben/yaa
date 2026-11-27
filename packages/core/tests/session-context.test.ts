import { type LayeredToggles, NO_TOGGLES } from "@yaa/contracts/agent-context";
import type { DiscoveredItem } from "@yaa/contracts/providers";
import { describe, expect, it } from "vitest";
import { sessionContext } from "../agents.ts";

const item = (name: string, active = true): DiscoveredItem => ({
	name,
	level: "user",
	source: "/config",
	active,
});

const toggles: LayeredToggles = {
	app: NO_TOGGLES,
	project: NO_TOGGLES,
	worktree: {
		mcpServers: { items: { docs: false } },
		skills: { items: { review: false } },
	},
};

const found = {
	mcpServers: [item("docs"), item("docs"), item("tracker"), item("old", false)],
	skills: [item("review")],
};

describe("sessionContext", () => {
	it("switches off by name and counts each name loaded once", () => {
		expect(
			sessionContext(found, toggles, ["mcp-toggling", "skill-toggling"]),
		).toEqual({
			off: { mcpServers: ["docs"], skills: ["review"] },
			loaded: { mcpServers: ["tracker"], skills: [] },
		});
	});

	it("counts what the provider cannot switch off as loaded", () => {
		expect(sessionContext(found, toggles, ["mcp-toggling"])).toEqual({
			off: { mcpServers: ["docs"], skills: [] },
			loaded: { mcpServers: ["tracker"], skills: ["review"] },
		});
	});
});
