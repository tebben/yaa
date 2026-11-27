import {
	type LayeredToggles,
	NO_TOGGLES,
	type ProviderDiscovery,
} from "@yaa/contracts/agent-context";
import type { DiscoveredItem } from "@yaa/contracts/providers";
import { describe, expect, it } from "vitest";
import { type ListedProvider, toggleList } from "../rows.ts";

const providers: ListedProvider[] = [
	{ id: "a", title: "A", capabilities: ["discovery", "skill-toggling"] },
	{ id: "b", title: "B", capabilities: ["discovery"] },
];

const skill = (name: string, active = true): DiscoveredItem => ({
	name,
	level: "worktree",
	source: `/skills/${name}`,
	active,
});

const finds = (
	provider: string,
	...skills: DiscoveredItem[]
): ProviderDiscovery => ({
	provider,
	found: true,
	discovery: { mcpServers: [], skills },
});

const toggles = (set: Partial<LayeredToggles>): LayeredToggles => ({
	app: NO_TOGGLES,
	project: NO_TOGGLES,
	worktree: NO_TOGGLES,
	...set,
});

const off = (name: string) => ({
	...NO_TOGGLES,
	skills: { items: { [name]: false } },
});

describe("toggleList", () => {
	it("merges providers by name and names those that load it anyway", () => {
		const list = toggleList(
			"skills",
			[finds("a", skill("review")), finds("b", skill("review"))],
			providers,
			toggles({ worktree: off("review") }),
			"worktree",
		);

		expect(list.rows).toHaveLength(1);
		expect(list.rows[0]).toMatchObject({
			providers: ["A", "B"],
			enabled: false,
			from: "worktree",
			setHere: true,
			switchable: true,
			keptBy: ["B"],
		});
		expect(list.on).toBe(1);
	});

	it("offers no switch where no provider can honor it", () => {
		const list = toggleList(
			"skills",
			[finds("b", skill("review"))],
			providers,
			toggles({}),
			"worktree",
		);

		expect(list.switchable).toBe(false);
		expect(list.rows[0]?.switchable).toBe(false);
	});

	it("shows a layer without the more specific ones, and who overrules it", () => {
		const list = toggleList(
			"skills",
			[finds("a", skill("review"))],
			providers,
			toggles({ worktree: off("review") }),
			"app",
		);

		expect(list.rows[0]).toMatchObject({
			enabled: true,
			from: undefined,
			setHere: false,
			overriddenBy: "worktree",
		});
		expect(list.setHere).toBe(false);
	});

	it("does not count what the agent's own configuration leaves out", () => {
		const list = toggleList(
			"skills",
			[finds("a", skill("review", false), skill("release"))],
			providers,
			toggles({}),
			"worktree",
		);

		expect(list.rows.map(({ name }) => name)).toEqual(["release", "review"]);
		expect(list.rows[1]?.unavailable).toBe(true);
		expect(list.on).toBe(1);
	});
});
