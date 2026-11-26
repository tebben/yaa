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

// A file's text as it is on disk. `version` stands for its bytes: a write
// names the one it replaces. A `binary` file is not UTF-8 text.
export const fileContent = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("text"),
		text: z.string(),
		version: z.string(),
	}),
	z.object({ kind: z.literal("binary") }),
	z.object({ kind: z.literal("tooLarge") }),
	z.object({ kind: z.literal("missing") }),
]);

// `changed`: nothing was written, because the file was not at the version the
// write named. `version` is what it is at now, null when it is not there.
export const fileWrite = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("written"), version: z.string() }),
	z.object({ kind: z.literal("changed"), version: z.string().nullable() }),
]);

export type GitFiles = z.infer<typeof gitFiles>;
export type GitChangeKind = z.infer<typeof gitChangeKind>;
export type GitChange = z.infer<typeof gitChange>;
export type DirEntry = z.infer<typeof dirEntry>;
export type FileContent = z.infer<typeof fileContent>;
export type FileWrite = z.infer<typeof fileWrite>;
