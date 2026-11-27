import { describe, expect, it } from "vitest";
import { fontStack, stepNumber } from "../index.ts";

describe("stepNumber", () => {
	const range = { min: 0, max: 24, step: 2 };

	it("moves by whole steps and stays in range", () => {
		expect(stepNumber(8, 1, range)).toBe(10);
		expect(stepNumber(8, -1, range)).toBe(6);
		expect(stepNumber(24, 1, range)).toBe(24);
		expect(stepNumber(0, -1, range)).toBe(0);
	});

	it("lands on the step grid from a value between steps", () => {
		expect(stepNumber(13, 1, range)).toBe(14);
		expect(stepNumber(13, -1, range)).toBe(12);
	});

	it("only clamps a typed value", () => {
		expect(stepNumber(13, 0, range)).toBe(13);
		expect(stepNumber(40, 0, range)).toBe(24);
	});

	it("does not drift with fractional steps", () => {
		expect(stepNumber(1.2, 1, { min: 1, max: 2.5, step: 0.1 })).toBe(1.3);
	});
});

describe("fontStack", () => {
	const fallback = '"Geist Mono Variable", monospace';

	it("puts a quoted family before the fallback", () => {
		expect(fontStack("JetBrains Mono", fallback)).toBe(
			`"JetBrains Mono", ${fallback}`,
		);
	});

	it("keeps a list as it is", () => {
		expect(fontStack("'Fira Code', Menlo", fallback)).toBe(
			`'Fira Code', Menlo, ${fallback}`,
		);
	});

	it("gives the fallback for an empty family", () => {
		expect(fontStack("  ", fallback)).toBe(fallback);
	});
});
