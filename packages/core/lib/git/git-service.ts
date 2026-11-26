import type { BranchStatus } from "@yaa/contracts/projects";
import { createKeyedQueue } from "./keyed-queue.ts";
import { parseBranches } from "./parse-branches.ts";
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
	branches(repo: string): Promise<{ local: string[]; remote: string[] }>;
	// The files in `dir` that git does not track, ignored ones included, and
	// that match one of the glob patterns, relative to `dir`. A repository
	// inside it is listed as its folder.
	untracked(dir: string, patterns: readonly string[]): Promise<string[]>;
	// How many commits of `branch` are neither on `base` nor on a remote.
	unpushed(repo: string, branch: string, base: string): Promise<number>;
	// The remote and the branch there that `branch` tracks, if any.
	upstream(
		repo: string,
		branch: string,
	): Promise<{ remote: string; branch: string } | undefined>;
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
		branches: async (repo) =>
			parseBranches(
				await run(repo, [
					"for-each-ref",
					"--format=%(refname)",
					"refs/heads",
					"refs/remotes",
				]),
			),
		async untracked(dir, patterns) {
			// Without a pattern, git would list every untracked file.
			if (patterns.length === 0) return [];
			const out = await run(dir, [
				"ls-files",
				"-z",
				"--others",
				"--",
				...patterns.map((pattern) => `:(glob)${pattern}`),
			]);
			return out.split("\0").filter((path) => path !== "");
		},
		unpushed: async (repo, branch, base) =>
			Number(
				(
					await run(repo, [
						"rev-list",
						"--count",
						`refs/heads/${branch}`,
						"--not",
						`refs/heads/${base}`,
						"--remotes",
					])
				).trim(),
			),
		async upstream(repo, branch) {
			const [remote = "", ref = ""] = (
				await run(repo, [
					"for-each-ref",
					"--format=%(upstream:remotename)%00%(upstream:remoteref)",
					`refs/heads/${branch}`,
				])
			)
				.trim()
				.split("\0");
			return remote === "" || !ref.startsWith("refs/heads/")
				? undefined
				: { remote, branch: ref.slice(11) };
		},
	};
};
