import { describe, expect, it } from "vitest";
import {
	CRASH_LIMIT,
	CRASH_WINDOW_MS,
	type PluginFolder,
	recordCrash,
	resolvePlugins,
} from "../plugins.ts";

const manifest = (id: string, contributes: object = {}) =>
	JSON.stringify({
		id,
		version: "1.0.0",
		main: "main.js",
		ui: "ui.js",
		contributes,
	});
const folder = (name: string, text: string | undefined): PluginFolder => ({
	folder: name,
	manifest: text,
});

describe("resolvePlugins", () => {
	it("loads valid plugins in folder order", () => {
		const { plugins, refused } = resolvePlugins([
			folder("a", manifest("a")),
			folder("b", manifest("b")),
		]);
		expect(plugins.map(({ id }) => id)).toEqual(["a", "b"]);
		expect(refused).toEqual([]);
	});

	it("refuses a folder without a manifest, with bad JSON or a bad manifest", () => {
		const { plugins, refused } = resolvePlugins([
			folder("none", undefined),
			folder("json", "{"),
			folder("schema", JSON.stringify({ id: "schema" })),
		]);
		expect(plugins).toEqual([]);
		expect(refused.map(({ folder }) => folder)).toEqual([
			"none",
			"json",
			"schema",
		]);
		expect(refused[0]?.problems).toEqual([
			{ path: [], message: "No plugin.json" },
		]);
		expect(refused[2]?.problems[0]?.path).toEqual(["version"]);
	});

	it("refuses a plugin whose id is not its folder's name", () => {
		const { refused } = resolvePlugins([folder("other", manifest("hello"))]);
		expect(refused[0]?.problems).toEqual([
			{ path: ["id"], message: "Expected the folder's name, other" },
		]);
	});

	it("refuses a when condition that does not parse", () => {
		const { refused } = resolvePlugins([
			folder(
				"a",
				manifest("a", {
					commands: [{ id: "a.go", title: "Go", when: "x &&" }],
				}),
			),
		]);
		expect(refused[0]?.problems[0]?.path).toEqual([
			"contributes",
			"commands",
			0,
			"when",
		]);
	});
});

describe("recordCrash", () => {
	it("uses up the budget with the limit's crash inside the window", () => {
		let crashes: number[] = [];
		for (let crash = 1; crash < CRASH_LIMIT; crash++) {
			const result = recordCrash(crashes, crash * 1000);
			expect(result.exhausted).toBe(false);
			crashes = result.crashes;
		}
		expect(recordCrash(crashes, CRASH_LIMIT * 1000).exhausted).toBe(true);
	});

	it("forgets crashes older than the window", () => {
		const old = Array.from({ length: CRASH_LIMIT - 1 }, (_, index) => index);
		const result = recordCrash(old, CRASH_WINDOW_MS + CRASH_LIMIT);
		expect(result).toEqual({
			crashes: [CRASH_WINDOW_MS + CRASH_LIMIT],
			exhausted: false,
		});
	});
});
