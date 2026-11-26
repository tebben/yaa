import type { DatabaseSync } from "node:sqlite";
import * as z from "zod";

// A terminal as the database keeps it, with the directory it opens in.
export type TerminalRecord = { id: string; worktree: string; cwd: string };

// The terminals table (storage/migrations.ts). Records go with their
// worktree.
export type TerminalStore = {
	// Oldest first.
	list(worktree: string): TerminalRecord[];
	get(id: string): TerminalRecord | undefined;
	add(record: TerminalRecord): void;
	move(id: string, cwd: string): void;
	remove(id: string): void;
};

const row = z
	.object({ id: z.string(), worktree_id: z.string(), cwd: z.string() })
	.transform(({ worktree_id, ...rest }) => ({
		...rest,
		worktree: worktree_id,
	}));

export const createTerminalStore = (db: DatabaseSync): TerminalStore => {
	const columns = "id, worktree_id, cwd";
	const selectByWorktree = db.prepare(
		`SELECT ${columns} FROM terminals WHERE worktree_id = ? ORDER BY rowid`,
	);
	const selectById = db.prepare(
		`SELECT ${columns} FROM terminals WHERE id = ?`,
	);
	const insert = db.prepare(
		"INSERT INTO terminals (id, worktree_id, cwd) VALUES (?, ?, ?)",
	);
	const update = db.prepare("UPDATE terminals SET cwd = ? WHERE id = ?");
	const deleteById = db.prepare("DELETE FROM terminals WHERE id = ?");
	return {
		list: (worktree) =>
			selectByWorktree.all(worktree).map((raw) => row.parse(raw)),
		get(id) {
			const found = selectById.get(id);
			return found === undefined ? undefined : row.parse(found);
		},
		add({ id, worktree, cwd }) {
			insert.run(id, worktree, cwd);
		},
		move(id, cwd) {
			update.run(cwd, id);
		},
		remove(id) {
			deleteById.run(id);
		},
	};
};
