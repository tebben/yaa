// The main worktree from `git worktree list --porcelain`: the first entry,
// a `worktree <path>` line followed by `bare` when the repository has no
// checkout.
export const mainWorktree = (
	output: string,
): { path: string; bare: boolean } | undefined => {
	const [first = ""] = output.split("\n\n");
	const lines = first.split("\n");
	const path = lines[0]?.match(/^worktree (.+)$/)?.[1];
	return path === undefined
		? undefined
		: { path, bare: lines.includes("bare") };
};
