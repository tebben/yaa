import { describe, expect, it } from "vitest";
import { buildTree, filterFiles, type Listing, visibleRows } from "../tree.ts";

const listing = (patch: Partial<Listing>): Listing => ({
	files: [],
	folders: [],
	ignored: [],
	changes: [],
	...patch,
});

const shown = (rows: ReturnType<typeof visibleRows>) =>
	rows.map(({ label, depth, status }) =>
		[`${"  ".repeat(depth)}${label}`, status].filter(Boolean).join(" "),
	);

describe("file tree", () => {
	it("nests files under their folders, folders first, as far as expanded", () => {
		const tree = buildTree(
			listing({ files: ["b.ts", "src/deep/a.ts", "src/c.ts", "a.ts"] }),
			new Map(),
		);
		expect(shown(visibleRows(tree, new Set(["src"])))).toEqual([
			"src",
			"  deep",
			"  c.ts",
			"a.ts",
			"b.ts",
		]);
	});

	it("marks changed files and the folders holding them, leaving out deleted ones", () => {
		const tree = buildTree(
			listing({
				files: ["src/edited.ts", "src/gone.ts", "kept.ts", "old/gone.ts"],
				changes: [
					{ path: "src/edited.ts", staged: "added", unstaged: "modified" },
					{ path: "src/gone.ts", staged: null, unstaged: "deleted" },
					{ path: "old/gone.ts", staged: null, unstaged: "deleted" },
					// Removed from the index and kept on disk.
					{ path: "kept.ts", staged: "deleted", unstaged: null },
					{ path: "kept.ts", staged: null, unstaged: "untracked" },
				],
			}),
			new Map(),
		);
		const rows = visibleRows(tree, new Set(["src"]));
		expect(shown(rows)).toEqual([
			"src",
			"  edited.ts added",
			"kept.ts untracked",
		]);
		expect(rows[0]?.changed).toBe(true);
	});

	it("shows ignored entries and reads folders git does not list", () => {
		const tree = buildTree(
			listing({
				files: ["a.ts"],
				folders: ["vendor"],
				ignored: ["node_modules/", ".env"],
			}),
			new Map([
				["node_modules/pkg", [{ name: "index.js", folder: false }]],
				["node_modules", [{ name: "pkg", folder: true }]],
			]),
		);
		const rows = visibleRows(
			tree,
			new Set(["node_modules", "node_modules/pkg"]),
		);
		expect(shown(rows)).toEqual([
			"node_modules",
			"  pkg",
			"    index.js",
			"vendor",
			".env",
			"a.ts",
		]);
		expect(rows.map(({ ignored }) => ignored)).toEqual([
			true,
			true,
			true,
			false,
			true,
			false,
		]);
		expect(rows.find(({ label }) => label === "vendor")?.lazy).toBe(true);
	});

	it("filters files by a fuzzy match on their path, up to the limit", () => {
		const tree = buildTree(
			listing({ files: ["src/tile-cache.ts", "src/map.ts", "tiles.md"] }),
			new Map(),
		);
		expect(filterFiles(tree, "stc", 10).map(({ label }) => label)).toEqual([
			"src/tile-cache.ts",
		]);
		expect(filterFiles(tree, "t", 1)).toHaveLength(1);
	});
});
