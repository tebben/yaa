import type { Migrations } from "./migrate.ts";

export const migrations: Migrations = [
	// 1: the event log (docs/glossary.md). `event` holds the whole event as
	// JSON; `type` is copied out of it for filtering.
	`CREATE TABLE events (
		seq INTEGER PRIMARY KEY AUTOINCREMENT,
		at INTEGER NOT NULL,
		type TEXT NOT NULL,
		event TEXT NOT NULL
	) STRICT;
	CREATE INDEX events_by_type ON events (type, seq);`,
	// 2: saved dock layouts, one per scope.
	`CREATE TABLE layouts (
		scope TEXT PRIMARY KEY,
		layout TEXT NOT NULL,
		saved_at INTEGER NOT NULL
	) STRICT;`,
	// 3: the project list (docs/spec/02-worktrees.md), in the order added.
	`CREATE TABLE projects (
		id TEXT PRIMARY KEY,
		path TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		default_branch TEXT NOT NULL,
		added_at INTEGER NOT NULL
	) STRICT;`,
];
