import { describe, expect, it } from "vitest";
import { keybinding } from "../keybindings.ts";

const accepts = (entry: unknown) => keybinding.safeParse(entry).success;

describe("keybinding schema", () => {
	it("accepts a key, a command and an optional when", () => {
		expect(accepts({ key: "ctrl+shift+p", command: "palette.open" })).toBe(
			true,
		);
		expect(
			accepts({ key: "f5", command: "run", when: "panel.kind == terminal" }),
		).toBe(true);
	});

	it("accepts a command prefixed by - to remove a default", () => {
		expect(accepts({ key: "ctrl+w", command: "-panel.close" })).toBe(true);
	});

	it("rejects upper case, unknown modifiers and spaces in the key", () => {
		expect(accepts({ key: "Ctrl+P", command: "a" })).toBe(false);
		expect(accepts({ key: "super+p", command: "a" })).toBe(false);
		expect(accepts({ key: "ctrl+ p", command: "a" })).toBe(false);
		expect(accepts({ key: "", command: "a" })).toBe(false);
	});

	it("rejects an empty command and a bare -", () => {
		expect(accepts({ key: "a", command: "" })).toBe(false);
		expect(accepts({ key: "a", command: "-" })).toBe(false);
	});

	it("rejects unknown fields, so a misspelled when is not ignored", () => {
		expect(accepts({ key: "a", command: "b", wen: "editor.focus" })).toBe(
			false,
		);
	});
});
