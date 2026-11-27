import * as z from "zod";

// A git worktree of a project (docs/spec/02-worktrees.md). `index` is its
// stable YAA_WORKTREE_INDEX: 0 for the project's main checkout, and for a
// worktree yaa created the lowest number from 1 up that no other worktree
// of the project held when it was created. A settled worktree is put away:
// nothing runs in it, and its folder, branch, chats and layout are kept
// until it is reopened or removed.
export const worktree = z.object({
	id: z.string(),
	branch: z.string(),
	path: z.string(),
	index: z.number().int().nonnegative(),
	settled: z.boolean(),
});

// A git repository added by folder (docs/spec/02-worktrees.md). `path` is
// the main checkout's folder, where the default branch lives. `worktrees`
// starts with the main checkout, then the ones yaa created, oldest first.
export const project = z.object({
	id: z.string(),
	name: z.string(),
	path: z.string(),
	defaultBranch: z.string(),
	worktrees: z.array(worktree),
});

// Adding fails, with a reason the user can act on, when the folder is not
// in a git repository or the project is already in the list.
export const addProjectResult = z.union([
	z.object({ project }),
	z.object({ problem: z.string() }),
]);

export const createWorktreeResult = z.union([
	z.object({ worktree }),
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

// What finishing a worktree would lose: uncommitted changes, and commits on
// its branch that are neither on the default branch nor on a remote. The
// remote branch is the upstream that deleting on the remote would delete.
// A folder removed outside yaa has nothing to lose.
export const finishCheck = z.object({
	folder: z.boolean(),
	changes: z.number().int().nonnegative(),
	unpushed: z.number().int().nonnegative(),
	remoteBranch: z.string().nullable(),
});

// How far finishing goes: settle the worktree, keeping everything; or,
// each step including the ones before, remove the folder, delete the local
// branch, delete the remote branch too.
export const finishAction = z.enum([
	"settle",
	"remove",
	"deleteBranch",
	"deleteRemote",
]);

// Where the window is: a project's overview, or one of its worktrees.
export const place = z.object({
	project: z.string(),
	worktree: z.string().optional(),
});

export type Worktree = z.infer<typeof worktree>;
export type Place = z.infer<typeof place>;
export type Project = z.infer<typeof project>;
export type AddProjectResult = z.infer<typeof addProjectResult>;
export type CreateWorktreeResult = z.infer<typeof createWorktreeResult>;
export type BranchStatus = z.infer<typeof branchStatus>;
export type FinishCheck = z.infer<typeof finishCheck>;
export type FinishAction = z.infer<typeof finishAction>;
