import * as z from "zod";

// A git repository added by folder (docs/spec/02-worktrees.md). `path` is
// the main checkout's folder, where the default branch lives.
export const project = z.object({
	id: z.string(),
	name: z.string(),
	path: z.string(),
	defaultBranch: z.string(),
});

// Adding fails, with a reason the user can act on, when the folder is not
// in a git repository or the project is already in the list.
export const addProjectResult = z.union([
	z.object({ project }),
	z.object({ problem: z.string() }),
]);

// What `git status` says about a checkout: the branch checked out (null
// when detached), its upstream if any, how far it is ahead of and behind
// the upstream, and how many files have uncommitted changes, untracked ones
// included.
export const branchStatus = z.object({
	branch: z.string().nullable(),
	upstream: z.string().nullable(),
	ahead: z.number().int().nonnegative(),
	behind: z.number().int().nonnegative(),
	changes: z.number().int().nonnegative(),
});

export type Project = z.infer<typeof project>;
export type AddProjectResult = z.infer<typeof addProjectResult>;
export type BranchStatus = z.infer<typeof branchStatus>;
