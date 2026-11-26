import type { DatabaseSync } from "node:sqlite";
import * as z from "zod";

// Dock layouts by scope. The layout is the renderer's serialized text,
// stored as is: only the renderer knows its shape.
export type LayoutStore = {
	get(scope: string): string | undefined;
	save(scope: string, layout: string): void;
};

const row = z.object({ layout: z.string() });

export const createLayoutStore = (
	db: DatabaseSync,
	now: () => number = Date.now,
): LayoutStore => {
	const select = db.prepare("SELECT layout FROM layouts WHERE scope = ?");
	const upsert = db.prepare(
		`INSERT INTO layouts (scope, layout, saved_at) VALUES (?, ?, ?)
		ON CONFLICT (scope) DO UPDATE SET layout = excluded.layout, saved_at = excluded.saved_at`,
	);
	return {
		get(scope) {
			const found = select.get(scope);
			return found === undefined ? undefined : row.parse(found).layout;
		},
		save(scope, layout) {
			upsert.run(scope, layout, now());
		},
	};
};
