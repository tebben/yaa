import type { BranchStatus } from "@yaa/contracts/projects";
import { createKeyedQueue } from "./keyed-queue.ts";
import { parseStatus } from "./parse-status.ts";
import { mainWorktree } from "./parse-worktree-list.ts";
import { type RunGit, runGit } from "./run-git.ts";

// Core's git service (docs/spec/02-worktrees.md). All worktrees of a project
// share one .git directory, so commands that change it run one at a time
// per repository; reading commands, such as status, run straight away.
export type GitService = {
	// Touches the repository's shared state (worktree add and remove, fetch,
	// gc, branch delete, ref updates): queued under `repo`, the project's
	// main checkout, which every worktree of the project passes.
	shared(repo: string, args: readonly string[]): Promise<string>;
	// The folder of the main checkout of the repository holding `dir`.
	mainCheckout(dir: string): Promise<string>;
	// The branch origin's HEAD points at; without one, the branch checked
	// out in `repo`.
	defaultBranch(repo: string): Promise<string>;
	status(dir: string): Promise<BranchStatus>;
};

export const createGitService = (run: RunGit = runGit): GitService => {
	const queue = createKeyedQueue();
	const symbolicRef = (dir: string, ref: string) =>
		run(dir, ["symbolic-ref", "--quiet", "--short", ref]).then((out) =>
			out.trim(),
		);

	return {
		shared: (repo, args) => queue.run(repo, () => run(repo, args)),
		async mainCheckout(dir) {
			const main = mainWorktree(
				await run(dir, ["worktree", "list", "--porcelain"]),
			);
			if (main === undefined) throw new Error(`No git repository at ${dir}`);
			if (main.bare) throw new Error(`${main.path} is a bare repository`);
			return main.path;
		},
		async defaultBranch(repo) {
			const remoteHead = await symbolicRef(
				repo,
				"refs/remotes/origin/HEAD",
			).catch(() => undefined);
			if (remoteHead !== undefined) return remoteHead.replace(/^origin\//, "");
			return symbolicRef(repo, "HEAD").catch(() => {
				throw new Error(
					"The checkout is on no branch and has no origin to name the default branch",
				);
			});
		},
		status: async (dir) =>
			parseStatus(await run(dir, ["status", "--porcelain=v2", "--branch"])),
	};
};
