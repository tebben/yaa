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
];
