import type { DatabaseSync } from "node:sqlite";
import * as z from "zod";

// Dock layouts by worktree, which go with it. The layout is the renderer's
// serialized text, stored as is: only the renderer knows its shape.
export type LayoutStore = {
	get(worktree: string): string | undefined;
	save(worktree: string, layout: string): void;
};

const row = z.object({ layout: z.string() });

export const createLayoutStore = (
	db: DatabaseSync,
	now: () => number = Date.now,
): LayoutStore => {
	const select = db.prepare("SELECT layout FROM layouts WHERE worktree_id = ?");
	const upsert = db.prepare(
		`INSERT INTO layouts (worktree_id, layout, saved_at) VALUES (?, ?, ?)
		ON CONFLICT (worktree_id) DO UPDATE SET layout = excluded.layout, saved_at = excluded.saved_at`,
	);
	return {
		get(worktree) {
			const found = select.get(worktree);
			return found === undefined ? undefined : row.parse(found).layout;
		},
		save(worktree, layout) {
			upsert.run(worktree, layout, now());
		},
	};
};
