import { describe, expect, it } from "vitest";
import { createKeymap } from "../keymap.ts";

const all = () => true;

describe("createKeymap", () => {
	const defaults = [
		{ key: "ctrl+w", command: "panel.close" },
		{ key: "escape", command: "palette.close", when: "palette.open" },
		{ key: "escape", command: "panel.blur" },
	];

	it("resolves to the first binding whose condition holds", () => {
		const keymap = createKeymap(defaults, []);
		expect(keymap.resolve("escape", { "palette.open": true }, all)).toBe(
			"palette.close",
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
		const canRun = (command: string) => command !== "plugin.gone";
		expect(keymap.resolve("ctrl+w", {}, canRun)).toBe("panel.close");
	});

	it("matches modifiers in any order", () => {
		const keymap = createKeymap([], [{ key: "shift+ctrl+p", command: "a" }]);
		expect(keymap.resolve("ctrl+shift+p", {}, all)).toBe("a");
	});
});
