import { describe, expect, it } from "vitest";
import { matchCommands } from "../command-match.ts";

const commands = [
	{ title: "Toggle left menu", category: "View" },
	{ title: "Close panel", category: "Panel" },
	{ title: "Focus panel left", category: "Panel" },
	{ title: "Reset layout", category: "Layout" },
];
const titles = (query: string) =>
	matchCommands(query, commands).map((command) => command.title);

describe("matchCommands", () => {
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

	it("matches the category too", () => {
		expect(titles("layout")).toEqual(["Reset layout"]);
	});
});
