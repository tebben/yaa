import { describe, expect, it } from "vitest";
import { keyFromEvent, keyParts } from "../key-chord.ts";

const event = (key: string, code: string, held: string[] = []) => ({
	key,
	code,
	ctrlKey: held.includes("ctrl"),
	shiftKey: held.includes("shift"),
	altKey: held.includes("alt"),
	metaKey: held.includes("meta"),
});

describe("keyFromEvent", () => {
	it("names letters and digits by physical key, modifiers in order", () => {
		expect(keyFromEvent(event("H", "KeyH", ["shift", "ctrl"]))).toBe(
			"ctrl+shift+h",
		);
		expect(keyFromEvent(event("!", "Digit1", ["shift"]))).toBe("shift+1");
	});

	it("names other keys by their lower-case name", () => {
		expect(keyFromEvent(event("Escape", "Escape"))).toBe("escape");
		expect(keyFromEvent(event("ArrowUp", "ArrowUp", ["alt"]))).toBe(
			"alt+arrowup",
		);
		expect(keyFromEvent(event(" ", "Space", ["ctrl"]))).toBe("ctrl+space");
	});

	it("gives nothing while only a modifier is pressed", () => {
		expect(keyFromEvent(event("Control", "ControlLeft", ["ctrl"]))).toBe(
			undefined,
		);
	});
});

describe("keyParts", () => {
	it("splits the key and capitalizes each part", () => {
		expect(keyParts("ctrl+shift+p")).toEqual(["Ctrl", "Shift", "P"]);
	});
});
