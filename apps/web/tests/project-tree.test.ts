import type { Project, Worktree } from "@yaa/contracts/projects";
import { describe, expect, it } from "vitest";
import {
	filterTree,
	listedPlace,
	nextWorktree,
	stepWorktree,
} from "../project-tree.ts";

const worktree = (id: string, index: number, settled = false): Worktree => ({
	id,
	branch: `branch-${id}`,
	path: `/w/${id}`,
	index,
	settled,
	permissionMode: "ask",
});

const projects: Project[] = [
	{
		id: "p",
		name: "repo",
		path: "/repo",
		defaultBranch: "main",
		worktrees: [
			worktree("main", 0),
			worktree("old", 1, true),
			worktree("new", 2),
		],
	},
];

describe("settled worktrees in the tree", () => {
	it("stand apart from the graph, and searching finds them", () => {
		expect(filterTree("", projects)).toEqual([
			{
				project: projects[0],
				worktrees: [worktree("main", 0), worktree("new", 2)],
				settled: [worktree("old", 1, true)],
			},
		]);
		expect(filterTree("branch-old", projects)[0]?.settled).toEqual([
			worktree("old", 1, true),
		]);
	});

	it("are skipped when moving through the tree, and not reopened as a place", () => {
		const at = { project: "p", worktree: "main" };
		expect(stepWorktree(projects, at, 1)).toEqual({
			project: "p",
			worktree: "new",
		});
		expect(nextWorktree(projects, at, () => true)?.worktree).toBe("new");
		expect(listedPlace(projects, { project: "p", worktree: "old" })).toBe(
			undefined,
		);
		expect(listedPlace(projects, { project: "p", worktree: "new" })).toEqual({
			project: "p",
			worktree: "new",
		});
	});
});
