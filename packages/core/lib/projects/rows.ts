import { join } from "node:path";
import type { Worktree } from "@yaa/contracts/projects";
import * as z from "zod";

// The rows of the projects and worktrees tables (storage/migrations.ts).
export const projectRow = z.object({
	id: z.string(),
	path: z.string(),
	name: z.string(),
	default_branch: z.string(),
});

export const worktreeRow = z
	.object({
		id: z.string(),
		project_id: z.string(),
		branch: z.string(),
		path: z.string(),
		idx: z.number(),
		settled_at: z.number().nullable(),
	})
	.transform(({ project_id, idx, settled_at, ...rest }) => ({
		...rest,
		projectId: project_id,
		index: idx,
		settled: settled_at !== null,
	}));

export type WorktreeRow = z.infer<typeof worktreeRow>;

export const WORKTREE_COLUMNS = "id, project_id, branch, path, idx, settled_at";

export const toWorktree = ({
	id,
	branch,
	path,
	index,
	settled,
}: WorktreeRow): Worktree => ({
	id,
	branch,
	path,
	index,
	settled,
});

// A leading ~ is the home folder.
export const expandHome = (path: string, home: string) =>
	path === "~" || path.startsWith("~/") ? join(home, path.slice(1)) : path;
