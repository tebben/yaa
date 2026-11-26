import { describe, expect, it } from "vitest";
import { generateTokenFiles } from "../token-codegen.ts";

const tokens = {
	$comment: "ignored",
	font: {
		sans: "Sans",
		mono: "Mono",
		size: { base: "12px" },
		lineHeight: { tight: "18px" },
		weight: { semibold: "600" },
	},
	radius: { control: "4px" },
	space: { "0.5": "2px" },
	size: { panelHeader: "30px" },
	density: { comfortable: 1 },
	color: { textSoft: "#aaa", state: { idle: "#888" } },
};

const variables = (json: unknown) =>
	generateTokenFiles(json)
		["theme.css"]?.split("\n")
		.filter((line) => line.startsWith("\t"))
		.map((line) => line.trim());

describe("generateTokenFiles", () => {
	it("puts each group in the Tailwind namespace that makes its utilities", () => {
		expect(variables(tokens)).toEqual([
			"--font-sans: Sans;",
			"--font-mono: Mono;",
			"--text-base: 12px;",
			"--leading-tight: 18px;",
			"--font-weight-semibold: 600;",
			"--radius-control: 4px;",
			"--spacing-0_5: 2px;",
			"--spacing-panel-header: 30px;",
			"--color-text-soft: #aaa;",
			"--color-state-idle: #888;",
		]);
	});

	it("types the same names it writes to the CSS", () => {
		const names = generateTokenFiles(tokens)["tokens.ts"];
		expect(names).toContain('\t| "spacing-panel-header"');
		expect(names).toContain('\t| "color-state-idle";');
	});

	it("rejects two tokens that map to one variable", () => {
		const clash = { ...tokens, size: { "0.5": "3px" } };
		expect(() => generateTokenFiles(clash)).toThrow("--spacing-0_5");
	});

	it("rejects a file without a required group", () => {
		const { radius: _, ...withoutRadius } = tokens;
		expect(() => generateTokenFiles(withoutRadius)).toThrow();
	});
});
