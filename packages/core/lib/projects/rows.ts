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
	})
	.transform(({ project_id, idx, ...rest }) => ({
		...rest,
		projectId: project_id,
		index: idx,
	}));

export type WorktreeRow = z.infer<typeof worktreeRow>;

export const WORKTREE_COLUMNS = "id, project_id, branch, path, idx";

export const toWorktree = ({
	id,
	branch,
	path,
	index,
}: WorktreeRow): Worktree => ({
	id,
	branch,
	path,
	index,
});

// A leading ~ is the home folder.
export const expandHome = (path: string, home: string) =>
	path === "~" || path.startsWith("~/") ? join(home, path.slice(1)) : path;
