import { describe, expect, it } from "vitest";
import { hexColor } from "../css-color.ts";

describe("hexColor", () => {
	it("passes hex through and converts rgba", () => {
		expect(hexColor(" #1A1e27 ")).toBe("#1a1e27");
		expect(hexColor("rgba(112, 191, 86, 0.13)")).toBe("#70bf5621");
		expect(hexColor("rgb(0, 128, 255)")).toBe("#0080ff");
	});

	it("refuses anything else", () => {
		expect(() => hexColor("")).toThrow();
		expect(() => hexColor("rebeccapurple")).toThrow();
	});
});
