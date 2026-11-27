import { describe, expect, it } from "vitest";
import {
	type LayeredToggles,
	NO_TOGGLES,
	resolveToggle,
	setToggle,
} from "../agent-context.ts";

const layers = (set: Partial<LayeredToggles>): LayeredToggles => ({
	app: NO_TOGGLES,
	project: NO_TOGGLES,
	worktree: NO_TOGGLES,
	...set,
});

describe("resolveToggle", () => {
	it("leaves on what no layer sets", () => {
		expect(resolveToggle(layers({}), "skills", "review")).toEqual({
			enabled: true,
			layer: undefined,
		});
	});

	it("takes the most specific layer that says anything", () => {
		const toggles = layers({
			app: setToggle(NO_TOGGLES, "skills", "review", true),
			project: setToggle(NO_TOGGLES, "skills", undefined, false),
		});

		expect(resolveToggle(toggles, "skills", "review")).toEqual({
			enabled: false,
			layer: "project",
		});
		expect(resolveToggle(toggles, "mcpServers", "review").enabled).toBe(true);
	});

	it("puts a layer's item over its whole list", () => {
		const all = setToggle(NO_TOGGLES, "skills", undefined, false);
		const worktree = setToggle(all, "skills", "review", true);

		expect(
			resolveToggle(layers({ worktree }), "skills", "review").enabled,
		).toBe(true);
	});
});

describe("setToggle", () => {
	it("takes a setting off", () => {
		const set = setToggle(NO_TOGGLES, "skills", "review", false);

		expect(setToggle(set, "skills", "review", undefined)).toEqual(NO_TOGGLES);
	});

	it("drops a layer's items when the whole list is set or reset", () => {
		const item = setToggle(NO_TOGGLES, "skills", "review", true);

		expect(setToggle(item, "skills", undefined, false).skills).toEqual({
			all: false,
			items: {},
		});
		expect(setToggle(item, "skills", undefined, undefined)).toEqual(NO_TOGGLES);
	});
});
