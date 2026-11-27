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
	// 4: worktrees (docs/spec/02-worktrees.md), with the main checkout of
	// each project as index 0, and layouts kept per worktree instead of one
	// for the app.
	`CREATE TABLE worktrees (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
		branch TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		idx INTEGER NOT NULL,
		created_at INTEGER NOT NULL,
		UNIQUE (project_id, idx)
	) STRICT;
	INSERT INTO worktrees (id, project_id, branch, path, idx, created_at)
		SELECT lower(hex(randomblob(16))), id, default_branch, path, 0, added_at
		FROM projects;
	DROP TABLE layouts;
	CREATE TABLE layouts (
		worktree_id TEXT PRIMARY KEY REFERENCES worktrees (id) ON DELETE CASCADE,
		layout TEXT NOT NULL,
		saved_at INTEGER NOT NULL
	) STRICT;`,
	// 5: what plugins keep per worktree (docs/spec/03-plugins.md).
	`CREATE TABLE plugin_storage (
		plugin TEXT NOT NULL,
		worktree_id TEXT NOT NULL REFERENCES worktrees (id) ON DELETE CASCADE,
		key TEXT NOT NULL,
		value TEXT NOT NULL,
		PRIMARY KEY (plugin, worktree_id, key)
	) STRICT;`,
	// 6: each worktree's terminals, so they open again where they were
	// (docs/spec/07-editor-files-terminal.md).
	`CREATE TABLE terminals (
		id TEXT PRIMARY KEY,
		worktree_id TEXT NOT NULL REFERENCES worktrees (id) ON DELETE CASCADE,
		cwd TEXT NOT NULL
	) STRICT;`,
	// 7: chats with their events, so they reopen after a restart
	// (docs/spec/11-platform-services.md). `agent_session` is the agent's own
	// session id, which resuming needs; `event` is an agent event as JSON.
	// `app_state` holds what the app reopens with, such as where the window
	// was, as JSON by key.
	`CREATE TABLE chats (
		id TEXT PRIMARY KEY,
		worktree_id TEXT NOT NULL REFERENCES worktrees (id) ON DELETE CASCADE,
		provider TEXT NOT NULL,
		agent_session TEXT NOT NULL,
		created_at INTEGER NOT NULL
	) STRICT;
	CREATE TABLE chat_events (
		chat_id TEXT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
		seq INTEGER NOT NULL,
		event TEXT NOT NULL,
		PRIMARY KEY (chat_id, seq)
	) STRICT;
	CREATE TABLE app_state (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	) STRICT;`,
	// 8: when a worktree was settled: put away with its folder, branch and
	// chats kept (docs/spec/02-worktrees.md); null while it is in use.
	"ALTER TABLE worktrees ADD COLUMN settled_at INTEGER;",
];
