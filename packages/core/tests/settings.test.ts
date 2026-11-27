import { describe, expect, it } from "vitest";
import * as z from "zod";
import {
	editSettingsText,
	resolveKeybindings,
	resolveSettings,
} from "../settings.ts";

const definitions = {
	"editor.fontSize": z.number().int().min(6).default(13),
	"editor.wrap": z.boolean().default(false),
};

const settings = (file: unknown) =>
	resolveSettings(definitions, JSON.stringify(file));

describe("resolveSettings", () => {
	it("gives the defaults for a missing or blank file", () => {
		const defaults = { "editor.fontSize": 13, "editor.wrap": false };
		expect(resolveSettings(definitions, undefined)).toEqual({
			values: defaults,
			problems: [],
		});
		expect(resolveSettings(definitions, "  \n").values).toEqual(defaults);
	});

	it("is what the settings page writes, keeping the rest of the file", () => {
		const text = JSON.stringify({ "editor.wrap": true, "old.key": 1 });
		expect(JSON.parse(editSettingsText(text, "editor.fontSize", 15))).toEqual({
			"editor.wrap": true,
			"old.key": 1,
			"editor.fontSize": 15,
		});
		expect(editSettingsText(text, "editor.wrap", undefined)).toBe(
			'{\n\t"old.key": 1\n}\n',
		);
		expect(
			JSON.parse(editSettingsText(undefined, "editor.wrap", true)),
		).toEqual({ "editor.wrap": true });
	});

	it("refuses to write over a file that does not parse or is not an object", () => {
		expect(() => editSettingsText("{", "editor.wrap", true)).toThrow(
			/does not parse/,
		);
		expect(() => editSettingsText("[]", "editor.wrap", true)).toThrow(
			/not a JSON object/,
		);
	});

	it("applies valid values", () => {
		expect(settings({ "editor.fontSize": 15 }).values).toEqual({
			"editor.fontSize": 15,
			"editor.wrap": false,
		});
	});

	it("falls back to the default for a rejected value and keeps the rest", () => {
		const result = settings({ "editor.fontSize": 2, "editor.wrap": true });
		expect(result.values).toEqual({
			"editor.fontSize": 13,
			"editor.wrap": true,
		});
		expect(result.problems).toEqual([
			{ path: ["editor.fontSize"], message: expect.any(String) },
		]);
	});

	it("reports and drops an unknown key", () => {
		const result = settings({ "editor.fontsize": 15 });
		expect(result.values["editor.fontSize"]).toBe(13);
		expect(result.problems).toEqual([
			{ path: ["editor.fontsize"], message: "Unknown setting" },
		]);
	});

	it("gives the defaults with one problem for invalid JSON or a non-object", () => {
		for (const text of ['{"editor.wrap": true,}', "[]", "3"]) {
			const result = resolveSettings(definitions, text);
			expect(result.values).toEqual({
				"editor.fontSize": 13,
				"editor.wrap": false,
			});
			expect(result.problems).toHaveLength(1);
			expect(result.problems[0]?.path).toEqual([]);
		}
	});
});

describe("resolveKeybindings", () => {
	it("gives no bindings for a missing file", () => {
		expect(resolveKeybindings(undefined)).toEqual({
			bindings: [],
			problems: [],
		});
	});

	it("drops a rejected entry with its index and field, and keeps the others", () => {
		const result = resolveKeybindings(
			JSON.stringify([
				{ key: "ctrl+p", command: "palette.open" },
				{ key: "Ctrl+K", command: "a" },
				{ key: "ctrl+w", command: "-panel.close", when: "editor.focus" },
			]),
		);
		expect(result.bindings).toEqual([
			{ key: "ctrl+p", command: "palette.open" },
			{ key: "ctrl+w", command: "-panel.close", when: "editor.focus" },
		]);
		expect(result.problems).toEqual([
			{ path: [1, "key"], message: expect.any(String) },
		]);
	});

	it("drops an entry whose when does not parse", () => {
		const result = resolveKeybindings(
			JSON.stringify([{ key: "ctrl+p", command: "a", when: "inputFocus &&" }]),
		);
		expect(result.bindings).toEqual([]);
		expect(result.problems).toEqual([
			{ path: [0, "when"], message: expect.any(String) },
		]);
	});

	it("gives no bindings with one problem for invalid JSON or a non-array", () => {
		for (const text of ["[", '{"key": "a"}']) {
			const result = resolveKeybindings(text);
			expect(result.bindings).toEqual([]);
			expect(result.problems).toHaveLength(1);
		}
	});
});
