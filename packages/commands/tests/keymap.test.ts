import { describe, expect, it } from "vitest";
import { createKeymap } from "../keymap.ts";

const all = () => ({});

describe("createKeymap", () => {
	const defaults = [
		{ key: "ctrl+w", command: "panel.close" },
		{ key: "escape", command: "input.edit", when: "focus.parked" },
		{ key: "escape", command: "panel.blur" },
	];

	it("resolves to the first binding whose condition holds", () => {
		const keymap = createKeymap(defaults, []);
		expect(keymap.resolve("escape", { "focus.parked": true }, all)).toBe(
			"input.edit",
		);
		expect(keymap.resolve("escape", {}, all)).toBe("panel.blur");
		expect(keymap.resolve("ctrl+q", {}, all)).toBeUndefined();
	});

	it("checks user bindings before the defaults", () => {
		const keymap = createKeymap(defaults, [
			{ key: "ctrl+w", command: "tab.close" },
		]);
		expect(keymap.resolve("ctrl+w", {}, all)).toBe("tab.close");
		expect(keymap.keysFor("panel.close")).toEqual(["ctrl+w"]);
	});

	it("removes a default with a - binding of the same key and command", () => {
		const keymap = createKeymap(defaults, [
			{ key: "ctrl+w", command: "-panel.close" },
		]);
		expect(keymap.resolve("ctrl+w", {}, all)).toBeUndefined();
		expect(keymap.keysFor("panel.close")).toEqual([]);
	});

	it("skips a binding whose command cannot run", () => {
		const keymap = createKeymap(defaults, [
			{ key: "ctrl+w", command: "plugin.gone" },
		]);
		const runnable = (command: string) =>
			command === "plugin.gone" ? undefined : {};
		expect(keymap.resolve("ctrl+w", {}, runnable)).toBe("panel.close");
	});

	it("keeps a panel command's key to its focused panel unless global", () => {
		const keymap = createKeymap(
			[
				{ key: "j", command: "files.next" },
				{ key: "alt+n", command: "chat.new", global: true },
			],
			[],
		);
		const inFiles = () => ({ panel: "files" });
		const at = (region: string, kind: string) => ({
			"focus.region": region,
			"panel.kind": kind,
		});
		expect(keymap.resolve("j", at("dock", "files"), inFiles)).toBe(
			"files.next",
		);
		expect(keymap.resolve("j", at("dock", "chat"), inFiles)).toBeUndefined();
		expect(keymap.resolve("j", at("menu", "files"), inFiles)).toBeUndefined();
		expect(keymap.resolve("alt+n", at("menu", "files"), inFiles)).toBe(
			"chat.new",
		);
	});

	it("matches modifiers in any order", () => {
		const keymap = createKeymap([], [{ key: "shift+ctrl+p", command: "a" }]);
		expect(keymap.resolve("ctrl+shift+p", {}, all)).toBe("a");
	});
});
