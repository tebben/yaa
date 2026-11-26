import { describe, expect, it } from "vitest";
import { fuzzyMatch, fuzzyScore } from "../fuzzy-match.ts";

const commands = [
	{ title: "Toggle left menu", category: "View" },
	{ title: "Close panel", category: "Panel" },
	{ title: "Focus panel left", category: "Panel" },
	{ title: "Reset layout", category: "Layout" },
];
const titles = (query: string) =>
	fuzzyMatch(
		query,
		commands,
		(command) => `${command.category} ${command.title}`,
	).map((command) => command.title);

describe("fuzzyMatch", () => {
	it("keeps every command in order for an empty query", () => {
		expect(titles(" ")).toHaveLength(4);
	});

	it("matches characters in order, ignoring case and spaces", () => {
		expect(titles("RESET lay")).toEqual(["Reset layout"]);
		expect(titles("tlm")).toEqual(["Toggle left menu"]);
		expect(titles("xyz")).toEqual([]);
	});

	it("ranks runs and word starts before scattered matches", () => {
		expect(titles("left")).toEqual(["Toggle left menu", "Focus panel left"]);
		expect(titles("panel le")[0]).toBe("Focus panel left");
	});

	it("matches the whole label, the category too", () => {
		expect(titles("layout")).toEqual(["Reset layout"]);
	});
});

describe("fuzzyScore", () => {
	it("scores 0 for an empty query and undefined for no match", () => {
		expect(fuzzyScore("", "anything")).toBe(0);
		expect(fuzzyScore("zz", "geo-viewer")).toBeUndefined();
		expect(fuzzyScore("gv", "geo-viewer")).toBe(0);
	});
});
