import { describe, expect, it } from "vitest";
import { changeRows } from "../rows.ts";

describe("change rows", () => {
	it("groups only the selected section under its folders", () => {
		const changes = [
			{ path: "src/a.ts", staged: "modified" as const, unstaged: null },
			{ path: "src/lib/b.ts", staged: null, unstaged: "untracked" as const },
			{ path: "src/lib/c.ts", staged: null, unstaged: "modified" as const },
		];
		expect(changeRows(changes, "unstaged", true)).toEqual([
			{
				path: "src",
				label: "src",
				depth: 0,
				folder: true,
				paths: ["src/lib/b.ts", "src/lib/c.ts"],
			},
			{
				path: "src/lib",
				label: "lib",
				depth: 1,
				folder: true,
				paths: ["src/lib/b.ts", "src/lib/c.ts"],
			},
			{
				path: "src/lib/b.ts",
				label: "b.ts",
				depth: 2,
				folder: false,
				paths: ["src/lib/b.ts"],
			},
			{
				path: "src/lib/c.ts",
				label: "c.ts",
				depth: 2,
				folder: false,
				paths: ["src/lib/c.ts"],
			},
		]);
		expect(changeRows(changes, "staged", false)).toEqual([
			{
				path: "src/a.ts",
				label: "src/a.ts",
				depth: 0,
				folder: false,
				paths: ["src/a.ts"],
			},
		]);
	});
});
