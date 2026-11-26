<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Sessions, persistence and recovery

Lands in: M1 for the database, migrations and the event log; M2 for the rest.

- Chat transcripts, the event log, run state, annotations and layouts are stored in one local SQLite database, `yaa.db` in the app's data folder (`~/.config/yaa` on Linux), and restored on start. Worktrees reopen with their tabs, terminals' working directories and chats.
- Schema changes go through numbered migrations from the first table on, tracked in `PRAGMA user_version`. Each migration runs in its own transaction; a failed one leaves the database at the last version that applied. Shipped migrations are never edited, and the core refuses to open a database from a newer app.
- Every event in the event log has a schema in `contracts` and is validated when written and when read.
- Dev mode uses its own data folder (`~/.config/yaa-dev`), so a development build never migrates the installed app's database.
- A supervisor in core watches agent and plugin-host processes. A crashed agent sets the worktree to Error with the last output kept; the user or a workflow can restart it and resume the session where the agent supports resuming.
- A turn that was running when the app closed is marked interrupted, not silently lost.

## Permissions and secrets

Lands in: M2 for permission modes; M4 for the keyring, with the first secret (Jira).

- Each worktree has an agent permission mode (ask for everything, ask for risky actions, allow all) applied through the provider where the agent supports it, and shown in the chat header next to the model.
- Permission requests from agents are events, so they can be answered in the chat, in a panel, or by a workflow step.
- Secrets (Jira token, API keys) are stored in the operating system keyring, never in the JSON config or the repository.

## Notifications

Lands in: M5.

An OS notification and a tray or dock badge when a worktree needs attention, a run waits for approval, a turn ends, or CI finishes. Which events notify is a setting per project, and clicking a notification focuses that worktree.

## Search

Lands in: M3 for text search; search across transcripts, annotations and runs: Later.

- Text search across the active worktree through ripgrep, with results as a panel and a key to open each hit.
- A search across chat transcripts, annotations and runs, backed by the local database.

## Conflicts, rebase and stash

Lands in: M3.

Parallel worktrees will conflict. The git plugin lists conflicted files, opens a three-way merge in the editor, and supports abort, continue, rebase onto the default branch and stash. A "resolve with agent" action sends the conflict context to the active chat, with the result still reviewed in the diff.

## First run and environment check

Lands in: M6.

A first-run flow and a doctor command check for `git`, each agent CLI, `gh` and `glab`, show each one's sign-in state, and say what to install or run. The doctor also reports when the app runs without Chromium's sandbox and how to fix it: on Ubuntu, install the deb, or add an AppArmor profile for the AppImage (`docs/spec/12-stack-packaging.md`). The same check is available any time from the palette.

## Settings and keybinding files

Lands in: M1 for app-level files; M6 for project and worktree layers, export and import.

Settings and keybindings are human-editable files with a schema, layered as app, project, then worktree. Core settings and plugin settings share the mechanism, and the settings page is rendered from the same schema. A settings file can be exported and imported.

## Logs and debug panel

Lands in: M1 for log files; M2 for the debug panel.

Core, plugin host, agent protocol and workflow logs go to one place with levels and filters, shown in a debug panel and written to files with rotation. The same logs feed the plugin-authoring tools for agents.

- The core writes the file. Main and the plugin host send their lines to it, each line tagged with its source (main, core, plugin host, agent, workflow); a line main logs while the core restarts reaches the next core.
- One JSON object per line in `yaa.log` in the app's log folder (`~/.config/yaa/logs` on Linux), written synchronously so the lines before a crash are on disk. The file rotates at 5 MB and the last three rotated files are kept (`yaa.1.log` is the newest).
- Levels are debug, info, warn and error. Production writes info and above; dev mode writes debug too and echoes every line to the terminal. An uncaught exception in the core is logged before the core exits and main restarts it. A core that exits before it is ready, for example on a database from a newer app, is not restarted: main shows an error naming the log file and quits.

## Plugin API versions and licence

Lands in: M6.

- The manifest declares the plugin API version it targets, and the plugin manager refuses or warns on a mismatch. It also checks the Svelte version a plugin was built with (see `03-plugins.md`). Plugins are installed by placing a folder in the plugin directory; there is no marketplace.
- The app sends no telemetry. The licence is MIT (`docs/decisions/0001-licence-mit.md`). Third-party licences are collected into a generated notices file that ships with the app, and CI fails when a dependency has a licence outside an allow-list (MIT, ISC, BSD, Apache-2.0, OFL for fonts).
