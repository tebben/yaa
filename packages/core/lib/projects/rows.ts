import { join } from "node:path";
import { permissionMode } from "@yaa/contracts/permission-modes";
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
		permission_mode: permissionMode,
	})
	.transform(({ project_id, idx, settled_at, permission_mode, ...rest }) => ({
		...rest,
		permissionMode: permission_mode,
		projectId: project_id,
		index: idx,
		settled: settled_at !== null,
	}));

export type WorktreeRow = z.infer<typeof worktreeRow>;

export const WORKTREE_COLUMNS =
	"id, project_id, branch, path, idx, settled_at, permission_mode";

export const toWorktree = ({
	id,
	branch,
	path,
	index,
	settled,
	permissionMode,
}: WorktreeRow): Worktree => ({
	id,
	branch,
	path,
	index,
	settled,
	permissionMode,
});

// A leading ~ is the home folder.
export const expandHome = (path: string, home: string) =>
	path === "~" || path.startsWith("~/") ? join(home, path.slice(1)) : path;
