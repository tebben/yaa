import { randomUUID } from "node:crypto";
import { basename, isAbsolute, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type {
	AddProjectResult,
	BranchStatus,
	Project,
} from "@yaa/contracts/projects";
import * as z from "zod";
import type { GitService } from "../git/git-service.ts";

export type Projects = {
	// In the order they were added.
	list(): Project[];
	add(path: string): Promise<AddProjectResult>;
	remove(id: string): void;
	// The status of the project's main checkout.
	status(id: string): Promise<BranchStatus>;
	onChange(listener: (projects: Project[]) => void): void;
};

type ProjectsOptions = {
	db: DatabaseSync;
	git: Pick<GitService, "mainCheckout" | "defaultBranch" | "status">;
	// What a leading ~ in a path stands for.
	home: string;
	newId?: () => string;
	now?: () => number;
};

const row = z
	.object({
		id: z.string(),
		path: z.string(),
		name: z.string(),
		default_branch: z.string(),
	})
	.transform(
		({ id, path, name, default_branch }): Project => ({
			id,
			path,
			name,
			defaultBranch: default_branch,
		}),
	);

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The projects in the database (docs/spec/02-worktrees.md). A project is
// stored by its main checkout, whichever of its folders was given.
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
	const selectByPath = db.prepare("SELECT id FROM projects WHERE path = ?");
	const selectById = db.prepare(
		"SELECT id, path, name, default_branch FROM projects WHERE id = ?",
	);
	const insert = db.prepare(
		"INSERT INTO projects (id, path, name, default_branch, added_at) VALUES (?, ?, ?, ?, ?)",
	);
	const deleteById = db.prepare("DELETE FROM projects WHERE id = ?");
	const listeners = new Set<(projects: Project[]) => void>();

	const list = () => selectAll.all().map((raw) => row.parse(raw));
	const changed = () => {
		const projects = list();
		for (const listener of listeners) listener(projects);
	};
	const expand = (path: string) =>
		path === "~" || path.startsWith("~/") ? join(home, path.slice(1)) : path;

	return {
		list,
		async add(given) {
			const path = expand(given.trim());
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
			const added: Project = {
				id: newId(),
				name: basename(checkout),
				path: checkout,
				defaultBranch,
			};
			insert.run(added.id, added.path, added.name, defaultBranch, now());
			changed();
			return { project: added };
		},
		remove(id) {
			if (Number(deleteById.run(id).changes) > 0) changed();
		},
		async status(id) {
			const found = selectById.get(id);
			if (found === undefined) throw new Error(`No project ${id}`);
			return git.status(row.parse(found).path);
		},
		onChange(listener) {
			listeners.add(listener);
		},
	};
};
