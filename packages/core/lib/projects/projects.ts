import { randomUUID } from "node:crypto";
import { basename, isAbsolute } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { AddProjectResult, Project } from "@yaa/contracts/projects";
import type { GitService } from "../git/git-service.ts";
import {
	expandHome,
	projectRow,
	toWorktree,
	WORKTREE_COLUMNS,
	worktreeRow,
} from "./rows.ts";

export type Projects = {
	// In the order they were added, each with its worktrees.
	list(): Project[];
	add(path: string): Promise<AddProjectResult>;
	remove(id: string): void;
	onChange(listener: () => void): void;
};

type ProjectsOptions = {
	db: DatabaseSync;
	git: Pick<GitService, "mainCheckout" | "defaultBranch">;
	// What a leading ~ in a path stands for.
	home: string;
	newId?: () => string;
	now?: () => number;
};

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The projects in the database (docs/spec/02-worktrees.md). A project is
// stored by its main checkout, whichever of its folders was given, and the
// main checkout is its first worktree. Removing a project forgets its
// worktrees and leaves every folder alone.
export const createProjects = ({
	db,
	git,
	home,
	newId = randomUUID,
	now = Date.now,
}: ProjectsOptions): Projects => {
	const selectAll = db.prepare(
		"SELECT id, path, name, default_branch FROM projects ORDER BY added_at, rowid",
	);
	const selectWorktrees = db.prepare(
		`SELECT ${WORKTREE_COLUMNS} FROM worktrees ORDER BY idx > 0, created_at, rowid`,
	);
	const selectByPath = db.prepare("SELECT id FROM projects WHERE path = ?");
	const insert = db.prepare(
		"INSERT INTO projects (id, path, name, default_branch, added_at) VALUES (?, ?, ?, ?, ?)",
	);
	const insertMain = db.prepare(
		"INSERT INTO worktrees (id, project_id, branch, path, idx, created_at) VALUES (?, ?, ?, ?, 0, ?)",
	);
	const deleteById = db.prepare("DELETE FROM projects WHERE id = ?");
	const listeners = new Set<() => void>();

	const list = (): Project[] => {
		const worktrees = selectWorktrees
			.all()
			.map((raw) => worktreeRow.parse(raw));
		return selectAll.all().map((raw) => {
			const { id, path, name, default_branch } = projectRow.parse(raw);
			return {
				id,
				path,
				name,
				defaultBranch: default_branch,
				worktrees: worktrees
					.filter(({ projectId }) => projectId === id)
					.map(toWorktree),
			};
		});
	};
	const changed = () => {
		for (const listener of listeners) listener();
	};

	return {
		list,
		async add(given) {
			const path = expandHome(given.trim(), home);
			if (!isAbsolute(path)) {
				return { problem: "Give the full path, or one that starts with ~" };
			}
			let checkout: string;
			let defaultBranch: string;
			try {
				checkout = await git.mainCheckout(path);
				defaultBranch = await git.defaultBranch(checkout);
			} catch (error) {
				return { problem: describe(error) };
			}
			if (selectByPath.get(checkout) !== undefined) {
				return { problem: `${checkout} is already in the list` };
			}
			const id = newId();
			const main = {
				id: newId(),
				branch: defaultBranch,
				path: checkout,
				index: 0,
			};
			const at = now();
			db.exec("BEGIN");
			insert.run(id, checkout, basename(checkout), defaultBranch, at);
			insertMain.run(main.id, id, defaultBranch, checkout, at);
			db.exec("COMMIT");
			changed();
			return {
				project: {
					id,
					name: basename(checkout),
					path: checkout,
					defaultBranch,
					worktrees: [main],
				},
			};
		},
		remove(id) {
			if (Number(deleteById.run(id).changes) > 0) changed();
		},
		onChange(listener) {
			listeners.add(listener);
		},
	};
};
