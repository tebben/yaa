import * as z from "zod";

// A worktree's files as core reads them for plugins. Paths are relative to
// the worktree's folder, with `/` between names.

// What `git ls-files` knows of: tracked and untracked files, ignored ones
// left out, and the folders git does not look into, such as a submodule or a
// repository inside the worktree.
export const gitFiles = z.object({
	files: z.array(z.string()),
	folders: z.array(z.string()),
});

export const gitChangeKind = z.enum([
	"modified",
	"added",
	"deleted",
	"renamed",
	"copied",
	"typeChanged",
	"untracked",
	"unmerged",
]);

// A file with uncommitted changes: what is staged, and what is not. An
// untracked file has only the latter; a conflicted one is unmerged there.
export const gitChange = z.object({
	path: z.string(),
	staged: gitChangeKind.nullable(),
	unstaged: gitChangeKind.nullable(),
});

export const dirEntry = z.object({
	name: z.string(),
	folder: z.boolean(),
});

export type GitFiles = z.infer<typeof gitFiles>;
export type GitChangeKind = z.infer<typeof gitChangeKind>;
export type GitChange = z.infer<typeof gitChange>;
export type DirEntry = z.infer<typeof dirEntry>;
