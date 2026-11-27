import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { PermissionMode } from "@yaa/contracts/permission-modes";
import type {
	BranchStatus,
	CreateWorktreeResult,
	FinishAction,
	FinishCheck,
	Worktree,
} from "@yaa/contracts/projects";
import type { CoreSettings } from "@yaa/contracts/settings";
import { worktreeName } from "@yaa/contracts/worktree-name";
import type { GitService } from "../git/git-service.ts";
import type { StepsRunner } from "../steps/worktree-steps.ts";
import {
	expandHome,
	projectRow,
	WORKTREE_COLUMNS,
	type WorktreeRow,
	worktreeRow,
} from "./rows.ts";

export type Worktrees = {
	// Local branches, then remote ones as `<remote>/<branch>`.
	branches(project: string): Promise<string[]>;
	create(params: {
		project: string;
		text: string;
		base: string;
	}): Promise<CreateWorktreeResult>;
	// The worktree's folder.
	folder(id: string): string;
	status(id: string): Promise<BranchStatus>;
	finishCheck(id: string): Promise<FinishCheck>;
	finish(
		id: string,
		action: FinishAction,
		force: boolean,
	): Promise<{ problem?: string }>;
	// Puts a settled worktree back in use.
	reopen(id: string): { problem?: string };
	setPermissionMode(id: string, mode: PermissionMode): void;
	onChange(listener: () => void): void;
};

type WorktreesOptions = {
	db: DatabaseSync;
	git: Pick<
		GitService,
		"shared" | "status" | "branches" | "unpushed" | "upstream"
	>;
	settings(): Pick<
		CoreSettings,
		"worktree.directory" | "worktree.branchTemplate" | "worktree.ticketPrefix"
	>;
	steps: Pick<StepsRunner, "setup" | "teardown" | "stop">;
	// What a leading ~ in a path stands for.
	home: string;
	exists?: (path: string) => boolean;
	newId?: () => string;
	now?: () => number;
};

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The lowest index from 1 up that none of `taken` holds.
const freeIndex = (taken: ReadonlySet<number>) => {
	let index = 1;
	while (taken.has(index)) index += 1;
	return index;
};

// Creating and finishing worktrees (docs/spec/02-worktrees.md). Git does
// the work, through the queue for the repository's shared state; the
// database keeps the list, with each worktree's stable index. The project's
// steps run after create and before the folder is removed.
export const createWorktrees = ({
	db,
	git,
	settings,
	steps,
	home,
	exists = existsSync,
	newId = randomUUID,
	now = Date.now,
}: WorktreesOptions): Worktrees => {
	const selectProject = db.prepare(
		"SELECT id, path, name, default_branch FROM projects WHERE id = ?",
	);
	const selectWorktree = db.prepare(
		`SELECT ${WORKTREE_COLUMNS} FROM worktrees WHERE id = ?`,
	);
	const selectIndexes = db.prepare(
		"SELECT idx FROM worktrees WHERE project_id = ?",
	);
	const insert = db.prepare(
		"INSERT INTO worktrees (id, project_id, branch, path, idx, created_at) VALUES (?, ?, ?, ?, ?, ?)",
	);
	const deleteById = db.prepare("DELETE FROM worktrees WHERE id = ?");
	const setSettled = db.prepare(
		"UPDATE worktrees SET settled_at = ? WHERE id = ?",
	);
	const setMode = db.prepare(
		"UPDATE worktrees SET permission_mode = ? WHERE id = ?",
	);
	const listeners = new Set<() => void>();
	const changed = () => {
		for (const listener of listeners) listener();
	};

	const project = (id: string) => {
		const found = selectProject.get(id);
		if (found === undefined) throw new Error(`No project ${id}`);
		return projectRow.parse(found);
	};
	const worktree = (id: string): WorktreeRow => {
		const found = selectWorktree.get(id);
		if (found === undefined) throw new Error(`No worktree ${id}`);
		return worktreeRow.parse(found);
	};
	// The main checkout is the project's own folder: finishing is for the
	// worktrees yaa created.
	const created = (id: string) => {
		const found = worktree(id);
		if (found.index === 0) {
			throw new Error(
				"The main checkout is the project; it cannot be finished",
			);
		}
		return { found, repo: project(found.projectId) };
	};
	const nextIndex = (projectId: string) =>
		freeIndex(
			new Set(selectIndexes.all(projectId).map((raw) => Number(raw["idx"]))),
		);

	// The worktree's branch, and what `git worktree add` gets before and
	// after the path.
	const plan = (
		text: string,
		base: string,
		branches: { local: string[]; remote: string[] },
	):
		| { branch: string; options: string[]; start: string }
		| { problem: string } => {
		if (text.trim() !== "") {
			const rules = settings();
			const name = worktreeName(text, {
				template: rules["worktree.branchTemplate"],
				ticketPrefix: rules["worktree.ticketPrefix"],
			});
			if ("problem" in name) return name;
			if (branches.local.includes(name.branch)) {
				return {
					problem: `Branch ${name.branch} exists already: create from it without a name`,
				};
			}
			// Without tracking, the new branch does not push to its base.
			return {
				branch: name.branch,
				options: ["--no-track", "-b", name.branch],
				start: base,
			};
		}
		if (branches.local.includes(base)) {
			return { branch: base, options: [], start: base };
		}
		if (branches.remote.includes(base)) {
			const branch = base.slice(base.indexOf("/") + 1);
			return branches.local.includes(branch)
				? { branch, options: [], start: branch }
				: { branch, options: ["--track", "-b", branch], start: base };
		}
		return { problem: `No branch ${base}` };
	};

	return {
		async branches(id) {
			const { local, remote } = await git.branches(project(id).path);
			return [...local, ...remote];
		},
		async create({ project: projectId, text, base }) {
			const repo = project(projectId);
			let planned: ReturnType<typeof plan>;
			try {
				planned = plan(text, base, await git.branches(repo.path));
			} catch (error) {
				return { problem: describe(error) };
			}
			if ("problem" in planned) return planned;
			const directory = expandHome(settings()["worktree.directory"], home);
			const path = join(
				directory,
				repo.name,
				planned.branch.replaceAll("/", "-"),
			);
			if (exists(path)) return { problem: `${path} exists already` };
			try {
				await git.shared(repo.path, [
					"worktree",
					"add",
					...planned.options,
					path,
					planned.start,
				]);
			} catch (error) {
				return { problem: describe(error) };
			}
			const added: Worktree = {
				id: newId(),
				branch: planned.branch,
				path,
				index: nextIndex(repo.id),
				settled: false,
				permissionMode: "ask",
			};
			insert.run(added.id, repo.id, added.branch, path, added.index, now());
			changed();
			// Setup may take long: the worktree is usable meanwhile, and the
			// runner records how it went.
			steps.setup({
				worktree: added.id,
				index: added.index,
				path,
				checkout: repo.path,
			});
			return { worktree: added };
		},
		folder: (id) => worktree(id).path,
		async status(id) {
			return git.status(worktree(id).path);
		},
		async finishCheck(id) {
			const { found, repo } = created(id);
			const folder = exists(found.path);
			const [status, unpushed, upstream] = await Promise.all([
				folder ? git.status(found.path) : undefined,
				git.unpushed(repo.path, found.branch, repo.default_branch),
				git.upstream(repo.path, found.branch),
			]);
			return {
				folder,
				changes: status?.changes ?? 0,
				unpushed,
				remoteBranch:
					upstream === undefined
						? null
						: `${upstream.remote}/${upstream.branch}`,
			};
		},
		async finish(id, action, force) {
			const { found, repo } = created(id);
			const forget = () => {
				deleteById.run(id);
				changed();
			};
			// Nothing runs in a settled worktree, and nothing of it is lost.
			if (action === "settle") {
				await steps.stop(id);
				setSettled.run(now(), id);
				changed();
				return {};
			}
			const folder = exists(found.path);
			if (folder) {
				const { problem } = await steps.teardown({
					worktree: id,
					index: found.index,
					path: found.path,
					checkout: repo.path,
				});
				if (problem !== undefined) {
					return {
						problem: `Teardown failed, so the worktree is kept: ${problem}`,
					};
				}
			} else {
				await steps.stop(id);
			}
			try {
				// A folder removed outside yaa leaves git a record to prune.
				await git.shared(
					repo.path,
					folder
						? ["worktree", "remove", ...(force ? ["--force"] : []), found.path]
						: ["worktree", "prune"],
				);
			} catch (error) {
				return { problem: describe(error) };
			}
			forget();
			if (action === "remove") return {};
			try {
				// Read before the branch, and its tracking config, are deleted.
				const upstream = await git.upstream(repo.path, found.branch);
				await git.shared(repo.path, [
					"branch",
					force ? "-D" : "-d",
					found.branch,
				]);
				if (action === "deleteRemote" && upstream !== undefined) {
					await git.shared(repo.path, [
						"push",
						upstream.remote,
						"--delete",
						upstream.branch,
					]);
				}
			} catch (error) {
				return {
					problem: `The worktree is removed, but: ${describe(error)}`,
				};
			}
			return {};
		},
		reopen(id) {
			const { found } = created(id);
			if (!exists(found.path)) {
				return {
					problem: `${found.path} is gone: remove the worktree to clear it`,
				};
			}
			setSettled.run(null, id);
			changed();
			return {};
		},
		setPermissionMode(id, mode) {
			if (Number(setMode.run(mode, id).changes) === 0) {
				throw new Error(`No worktree ${id}`);
			}
			changed();
		},
		onChange(listener) {
			listeners.add(listener);
		},
	};
};
