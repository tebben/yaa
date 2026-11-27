import type { DatabaseSync } from "node:sqlite";
import {
	type ContextToggles,
	contextToggles,
	NO_TOGGLES,
} from "@yaa/contracts/agent-context";
import * as z from "zod";

// One layer of what is switched off (docs/spec/09-mcp-skills.md).
export type ContextScope =
	| { layer: "app" }
	| { layer: "project"; project: string }
	| { layer: "worktree"; worktree: string };

export type ContextStore = {
	// Nothing switched at a layer never set.
	get(scope: ContextScope): ContextToggles;
	set(scope: ContextScope, toggles: ContextToggles): void;
};

const row = z.object({ toggles: z.string() });

const key = (scope: ContextScope) => {
	switch (scope.layer) {
		case "app":
			return "app";
		case "project":
			return `project:${scope.project}`;
		case "worktree":
			return `worktree:${scope.worktree}`;
	}
};

export const createContextStore = (db: DatabaseSync): ContextStore => {
	const select = db.prepare(
		"SELECT toggles FROM context_toggles WHERE scope = ?",
	);
	const upsert = db.prepare(
		`INSERT INTO context_toggles (scope, project_id, worktree_id, toggles)
		VALUES (?, ?, ?, ?)
		ON CONFLICT (scope) DO UPDATE SET toggles = excluded.toggles`,
	);
	return {
		get(scope) {
			const found = select.get(key(scope));
			return found === undefined
				? NO_TOGGLES
				: contextToggles.parse(JSON.parse(row.parse(found).toggles));
		},
		set(scope, toggles) {
			upsert.run(
				key(scope),
				scope.layer === "project" ? scope.project : null,
				scope.layer === "worktree" ? scope.worktree : null,
				JSON.stringify(contextToggles.parse(toggles)),
			);
		},
	};
};
