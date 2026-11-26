import * as z from "zod";

// Where a project's steps live, from the main checkout's folder
// (docs/decisions/0027-worktree-steps-file.md).
export const worktreeStepsPath = ".yaa/worktree.json";

const list = z.array(z.string().min(1)).default([]);

// Setup copies the main checkout's untracked files that match `copy` (git
// glob patterns) and then runs the `setup` commands in the new worktree;
// `teardown` commands run before its folder is removed
// (docs/spec/02-worktrees.md). An unknown field is refused, so a misspelt
// one does not silently do nothing.
export const worktreeSteps = z.strictObject({
	copy: list,
	setup: list,
	teardown: list,
});

export type WorktreeSteps = z.infer<typeof worktreeSteps>;
