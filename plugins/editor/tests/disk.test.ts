import { describe, expect, it } from "vitest";
import { diskChange } from "../disk.ts";

const text = (version: string) =>
	({ kind: "text", text: "", version }) as const;

describe("diskChange", () => {
	it("does nothing for the version the text was made from", () => {
		expect(diskChange({ version: "1", dirty: true }, text("1"))).toBe("none");
	});

	it("takes a new version only when nothing is unsaved", () => {
		expect(diskChange({ version: "1", dirty: false }, text("2"))).toBe(
			"reload",
		);
		expect(diskChange({ version: "1", dirty: true }, text("2"))).toBe(
			"conflict",
		);
	});

	it("never replaces unsaved text with a file that is no longer text", () => {
		const binary = { kind: "binary" } as const;
		expect(diskChange({ version: "1", dirty: true }, binary)).toBe("conflict");
		expect(diskChange({ version: "1", dirty: false }, binary)).toBe(
			"unreadable",
		);
	});

	it("reports a deleted file, but not one that was never there", () => {
		const missing = { kind: "missing" } as const;
		expect(diskChange({ version: "1", dirty: false }, missing)).toBe("deleted");
		expect(diskChange({ version: null, dirty: true }, missing)).toBe("none");
	});
});
