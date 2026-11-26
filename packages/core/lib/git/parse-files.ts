import type { GitFiles } from "@yaa/contracts/worktree-files";

const SUBMODULE = "160000 ";

export const splitNul = (output: string): string[] =>
	output.split("\0").filter((path) => path !== "");

// Reads `git ls-files -z --stage` and `git ls-files -z --others`. A conflict
// lists a path once per side; a submodule is a folder, and so is a
// repository inside the worktree, which the second lists with a `/`.
export const parseFiles = (tracked: string, others: string): GitFiles => {
	const files = new Set<string>();
	const folders = new Set<string>();
	for (const entry of splitNul(tracked)) {
		const path = entry.slice(entry.indexOf("\t") + 1);
		(entry.startsWith(SUBMODULE) ? folders : files).add(path);
	}
	for (const path of splitNul(others)) {
		if (path.endsWith("/")) folders.add(path.slice(0, -1));
		else files.add(path);
	}
	return { files: [...files], folders: [...folders] };
};
