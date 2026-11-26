import type { DatabaseSync } from "node:sqlite";
import * as z from "zod";

// One value a plugin keeps for a worktree.
export type PluginKey = { plugin: string; worktree: string; key: string };

// Plugins' values by worktree, which go with it. A value is the plugin's own
// text, stored as is.
export type PluginStore = {
	get(at: PluginKey): string | undefined;
	// A null value removes the key.
	set(at: PluginKey, value: string | null): void;
};

const row = z.object({ value: z.string() });

export const createPluginStore = (db: DatabaseSync): PluginStore => {
	const where = "plugin = ? AND worktree_id = ? AND key = ?";
	const select = db.prepare(`SELECT value FROM plugin_storage WHERE ${where}`);
	const remove = db.prepare(`DELETE FROM plugin_storage WHERE ${where}`);
	const upsert = db.prepare(
		`INSERT INTO plugin_storage (plugin, worktree_id, key, value) VALUES (?, ?, ?, ?)
		ON CONFLICT (plugin, worktree_id, key) DO UPDATE SET value = excluded.value`,
	);
	return {
		get({ plugin, worktree, key }) {
			const found = select.get(plugin, worktree, key);
			return found === undefined ? undefined : row.parse(found).value;
		},
		set({ plugin, worktree, key }, value) {
			if (value === null) remove.run(plugin, worktree, key);
			else upsert.run(plugin, worktree, key, value);
		},
	};
};
