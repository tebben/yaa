import { describe, expect, it } from "vitest";
import {
	changeLines,
	linkedFile,
	mentionedFile,
	splitTitle,
	worktreeFile,
} from "../files.ts";

const root = "/work/repo";

describe("file references", () => {
	it("reads paths under the worktree and refuses those that leave it", () => {
		expect(worktreeFile(`${root}/src/a.ts`, root)).toBe("src/a.ts");
		expect(worktreeFile("./src/a.ts", root)).toBe("src/a.ts");
		expect(worktreeFile("/work/repo-2/a.ts", root)).toBeUndefined();
		expect(worktreeFile("src/../../a.ts", root)).toBeUndefined();
	});

	it("reads a link's file and line, leaving web and anchor links", () => {
		expect(linkedFile("src/a%20b.ts:41", root)).toEqual({
			path: "src/a b.ts",
			line: 41,
		});
		expect(linkedFile(`file://${root}/README.md#L3-L9`, root)).toEqual({
			path: "README.md",
			line: 3,
		});
		expect(linkedFile("a.ts:2", root)).toEqual({ path: "a.ts", line: 2 });
		expect(linkedFile("https://example.com/a.ts", root)).toBeUndefined();
		expect(linkedFile("mailto:a@b.c", root)).toBeUndefined();
		expect(linkedFile("#usage", root)).toBeUndefined();
	});

	it("takes text for a file only when it clearly names one", () => {
		expect(mentionedFile("src/a.ts:41:2", root)).toEqual({
			path: "src/a.ts",
			line: 41,
		});
		expect(mentionedFile("a.ts:7", root)).toEqual({ path: "a.ts", line: 7 });
		expect(mentionedFile("this.cache", root)).toBeUndefined();
		expect(mentionedFile("src/tiles", root)).toBeUndefined();
		expect(mentionedFile("pnpm run a/b.ts", root)).toBeUndefined();
		expect(mentionedFile("https://x.io/a.ts", root)).toBeUndefined();
	});

	it("splits a title around the path it names", () => {
		expect(splitTitle("Edit src/a.ts now", "src/a.ts")).toEqual([
			"Edit ",
			" now",
		]);
		expect(splitTitle("Run tests", "src/a.ts")).toBeUndefined();
	});
});

describe("changeLines", () => {
	it("keeps the context around each change, with a gap between them", () => {
		const old = Array.from({ length: 20 }, (_, at) => `line ${at}`);
		const next = old.with(1, "second").with(18, "nineteenth");
		const lines = changeLines(old.join("\n"), next.join("\n"));
		expect(lines.filter(({ kind }) => kind === "gap")).toHaveLength(1);
		expect(lines).toContainEqual({ kind: "removed", text: "line 1" });
		expect(lines).toContainEqual({ kind: "added", text: "nineteenth" });
		expect(lines).not.toContainEqual({ kind: "context", text: "line 9" });
	});

	it("adds every line of a new file", () => {
		expect(changeLines(undefined, "a\nb\n")).toEqual([
			{ kind: "added", text: "a" },
			{ kind: "added", text: "b" },
		]);
	});
});
