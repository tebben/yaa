import { createHash } from "node:crypto";
import type { BranchStatus } from "@yaa/contracts/projects";
import type {
	FileContent,
	GitAction,
	GitChange,
	GitFiles,
	GitSection,
	GitSource,
} from "@yaa/contracts/worktree-files";
import { removePath } from "../files/file-operations.ts";
import { createKeyedQueue } from "./keyed-queue.ts";
import { parseBranches } from "./parse-branches.ts";
import { parseChanges } from "./parse-changes.ts";
import { parseFiles, splitNul } from "./parse-files.ts";
import { parseStatus } from "./parse-status.ts";
import { mainWorktree } from "./parse-worktree-list.ts";
import { type RunGit, runGit, runGitBytes } from "./run-git.ts";

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
	// The files with uncommitted changes, each untracked one by itself.
	changes(dir: string): Promise<GitChange[]>;
	read(dir: string, source: GitSource, path: string): Promise<FileContent>;
	change(
		dir: string,
		action: GitAction,
		section: GitSection,
		paths: readonly string[],
	): Promise<void>;
	commit(dir: string, message: string): Promise<void>;
	// Tracked and untracked files, ignored ones left out.
	files(dir: string): Promise<GitFiles>;
	// The ignored files and folders; a folder ends with `/` and stands for
	// everything in it.
	ignored(dir: string): Promise<string[]>;
	// The folder holding the checkout's own index and HEAD.
	gitDir(dir: string): Promise<string>;
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
	const indexes = createKeyedQueue();
	const symbolicRef = (dir: string, ref: string) =>
		run(dir, ["symbolic-ref", "--quiet", "--short", ref]).then((out) =>
			out.trim(),
		);
	const changes = async (dir: string) =>
		parseChanges(
			await run(dir, [
				"--no-optional-locks",
				"status",
				"--porcelain=v2",
				"-z",
				"--untracked-files=all",
			]),
		);
	const mainCheckout = async (dir: string) => {
		const main = mainWorktree(
			await run(dir, ["worktree", "list", "--porcelain"]),
		);
		if (main === undefined) throw new Error(`No git repository at ${dir}`);
		if (main.bare) throw new Error(`${main.path} is a bare repository`);
		return main.path;
	};

	return {
		shared: (repo, args) => queue.run(repo, () => run(repo, args)),
		mainCheckout,
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
		// Without optional locks, status leaves the index alone, so a watcher
		// that reads it after a change does not cause the next one.
		status: async (dir) =>
			parseStatus(
				await run(dir, [
					"--no-optional-locks",
					"status",
					"--porcelain=v2",
					"--branch",
				]),
			),
		changes,
		async read(dir, source, path) {
			if (
				path
					.split("/")
					.some((part) => ["", ".", "..", ".git"].includes(part.toLowerCase()))
			)
				throw new Error(`Not a path in the worktree: ${path}`);
			if (source === "head") {
				const status = await run(dir, [
					"--no-optional-locks",
					"status",
					"--porcelain=v2",
					"--branch",
				]);
				if (status.includes("# branch.oid (initial)"))
					return { kind: "missing" };
			}
			const output = await run(dir, [
				"--literal-pathspecs",
				...(source === "head"
					? ["ls-tree", "-z", "HEAD", "--", path]
					: ["ls-files", "--stage", "-z", "--", path]),
			]);
			const entries = output.split("\0").filter(Boolean);
			const entry = entries.find(
				(item) => item.slice(item.indexOf("\t") + 1) === path,
			);
			if (entry === undefined) return { kind: "missing" };
			const [metadata] = entry.split("\t");
			const fields = (metadata ?? "").split(" ");
			const hash = source === "head" ? fields[2] : fields[1];
			if (hash === undefined || (source === "index" && fields[2] !== "0")) {
				throw new Error(`Cannot read conflicted file ${path}`);
			}
			const size = Number((await run(dir, ["cat-file", "-s", hash])).trim());
			if (size > 10 * 1024 * 1024) return { kind: "tooLarge" };
			const bytes = await runGitBytes(dir, ["cat-file", "blob", hash]);
			if (bytes.includes(0)) return { kind: "binary" };
			try {
				const text = new TextDecoder("utf-8", {
					fatal: true,
					ignoreBOM: true,
				}).decode(bytes);
				return {
					kind: "text",
					text,
					version: createHash("sha256").update(bytes).digest("hex"),
				};
			} catch {
				return { kind: "binary" };
			}
		},
		change: (dir, action, section, paths) =>
			indexes.run(dir, async () => {
				if (
					(action === "stage" && section !== "unstaged") ||
					(action === "unstage" && section !== "staged")
				)
					throw new Error("That action does not apply to this section");
				const requested = new Set(paths);
				const selected = (await changes(dir)).filter(
					(change) => requested.has(change.path) && change[section] !== null,
				);
				if (selected.length !== requested.size || requested.size === 0) {
					throw new Error("The changes have changed; refresh and try again");
				}
				if (selected.some((change) => change[section] === "unmerged")) {
					throw new Error("Resolve conflicts before changing these files");
				}
				const names = [
					...new Set(
						selected.flatMap(({ path, originalPath, unstaged }) =>
							originalPath === undefined ||
							(action === "stage" && unstaged !== "renamed")
								? [path]
								: [path, originalPath],
						),
					),
				];
				const git = (args: string[], input?: string) =>
					run(dir, ["--literal-pathspecs", ...args], input);
				if (action === "stage") {
					await git(["add", "-A", "--", ...names]);
				} else if (action === "unstage") {
					const status = await git(["status", "--porcelain=v2", "--branch"]);
					if (status.includes("# branch.oid (initial)")) {
						await git([
							"rm",
							"-r",
							"--cached",
							"--ignore-unmatch",
							"--",
							...names,
						]);
					} else {
						await git(["reset", "-q", "HEAD", "--", ...names]);
					}
				} else if (section === "staged") {
					const patch = await git([
						"diff",
						"--cached",
						"--binary",
						"--no-ext-diff",
						"--",
						...names,
					]);
					if (patch === "") throw new Error("No staged changes to discard");
					if (selected.every((item) => item.unstaged === null)) {
						await git(["apply", "--reverse", "--index", "-"], patch);
					} else {
						await git(["apply", "--reverse", "--check", "-"], patch);
						await git(
							["apply", "--reverse", "--cached", "--check", "-"],
							patch,
						);
						await git(["apply", "--reverse", "-"], patch);
						try {
							await git(["apply", "--reverse", "--cached", "-"], patch);
						} catch (error) {
							try {
								await git(["apply", "-"], patch);
							} catch (rollback) {
								throw new AggregateError(
									[error, rollback],
									"Discard failed and the worktree could not be restored",
								);
							}
							throw error;
						}
					}
				} else {
					const tracked = selected.filter(
						(item) => item.unstaged !== "untracked",
					);
					if (tracked.length > 0) {
						await git([
							"restore",
							"--worktree",
							"--",
							...tracked.map(({ path }) => path),
						]);
					}
					for (const item of selected) {
						if (item.unstaged === "untracked") await removePath(dir, item.path);
					}
				}
			}),
		async commit(dir, message) {
			if (message.trim() === "")
				throw new Error("Write a commit message first");
			const repo = await mainCheckout(dir);
			await queue.run(repo, () =>
				indexes.run(dir, async () => {
					await run(dir, ["commit", "-m", message]);
				}),
			);
		},
		async files(dir) {
			const [tracked, others] = await Promise.all([
				run(dir, ["ls-files", "-z", "--stage"]),
				run(dir, ["ls-files", "-z", "--others", "--exclude-standard"]),
			]);
			return parseFiles(tracked, others);
		},
		ignored: async (dir) =>
			splitNul(
				await run(dir, [
					"ls-files",
					"-z",
					"--others",
					"--ignored",
					"--exclude-standard",
					"--directory",
				]),
			),
		gitDir: async (dir) =>
			(await run(dir, ["rev-parse", "--absolute-git-dir"])).trim(),
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
			return splitNul(out);
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
