import type { FileContent } from "@yaa/contracts/worktree-files";

// What an open file does about what is on disk now. `version` is the one its
// text was made from, null for a file that was not there; `dirty` is unsaved
// text.
export type DiskChange =
	// Nothing happened to the file.
	| "none"
	// Take the new text: there is nothing to lose.
	| "reload"
	// The file changed under unsaved text, which the user has to settle.
	| "conflict"
	// The file is gone.
	| "deleted"
	// What is there now cannot be shown, and there is nothing to lose.
	| "unreadable";

export const diskChange = (
	{ version, dirty }: { version: string | null; dirty: boolean },
	disk: FileContent,
): DiskChange => {
	if (disk.kind === "missing") return version === null ? "none" : "deleted";
	if (disk.kind === "text" && disk.version === version) return "none";
	if (dirty) return "conflict";
	return disk.kind === "text" ? "reload" : "unreadable";
};
