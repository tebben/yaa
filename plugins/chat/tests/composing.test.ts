import { describe, expect, it } from "vitest";
import { suggestCommands } from "../composing.ts";

const commands = [{ name: "edit" }, { name: "markdown" }, { name: "fail" }];

describe("suggestCommands", () => {
	it("suggests for a draft that is a slash and a word", () => {
		expect(suggestCommands("/", commands)).toEqual(commands);
		expect(suggestCommands("/md", commands)).toEqual([{ name: "markdown" }]);
		expect(suggestCommands("/md now", commands)).toEqual([]);
		expect(suggestCommands("see /md", commands)).toEqual([]);
	});

	it("stops once the draft names the only match", () => {
		expect(suggestCommands("/markdown", commands)).toEqual([]);
	});
});
