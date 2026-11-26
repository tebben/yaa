import { cp, lstat } from "node:fs/promises";
import { join } from "node:path";

export type CopyFiles = (copy: {
	from: string;
	to: string;
	// Relative to both folders.
	paths: readonly string[];
	signal: AbortSignal;
	copied(path: string): void;
	kept(path: string): void;
}) => Promise<void>;

const present = (path: string) =>
	lstat(path).then(
		() => true,
		(error: NodeJS.ErrnoException) => {
			if (error.code === "ENOENT") return false;
			throw error;
		},
	);

// Copies each path, links as links. What the target has already stays: git
// checked it out for the worktree's branch.
export const copyFiles: CopyFiles = async ({
	from,
	to,
	paths,
	signal,
	copied,
	kept,
}) => {
	for (const path of paths) {
		signal.throwIfAborted();
		const target = join(to, path);
		if (await present(target)) {
			kept(path);
			continue;
		}
		await cp(join(from, path), target, {
			recursive: true,
			verbatimSymlinks: true,
		});
		copied(path);
	}
};
