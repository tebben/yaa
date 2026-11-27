<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Sessions, persistence and recovery

Lands in: M1 for the database, migrations and the event log; M2 for the rest.

- Chat transcripts, the event log, run state, annotations and layouts are stored in one local SQLite database, `yaa.db` in the app's data folder (`~/.config/yaa` on Linux), and restored on start. Worktrees reopen with their tabs, terminals' working directories (see `07-editor-files-terminal.md`) and chats, and the window opens on the project overview or worktree it last showed, or on the first project's main checkout when that is gone.
- A chat is stored with every event it sent and the agent's own session id. After a restart its agents are not running: a chat's agent starts again when the chat next needs one, for a prompt or an option change, and resumes the session, so starting yaa costs no agent processes. Core resumes with ACP `session/resume`, or with `session/load` for an agent that only replays, whose replayed history is dropped because the chat has it (`docs/decisions/0014-acp-coverage.md`). An agent that can do neither fails the prompt with the reason, and a new chat is the way on.
- Schema changes go through numbered migrations from the first table on, tracked in `PRAGMA user_version`. Each migration runs in its own transaction; a failed one leaves the database at the last version that applied. Shipped migrations are never edited, and the core refuses to open a database from a newer app.
- Every event in the event log has a schema in `contracts` and is validated when written and when read.
- Dev mode uses its own data folder (`~/.config/yaa-dev`), so a development build never migrates the installed app's database.
- A supervisor in core watches agent and plugin-host processes. A crashed agent sets the worktree to Error with the last output kept; the chat's next prompt, from the user or a workflow, starts the agent again and resumes the session the same way.
- A turn that was running when the app closed is marked interrupted, not silently lost: the transcript says so, and the permission requests and questions it waited on show as unanswered.

## Permissions and secrets

Lands in: M2 for permission modes; M4 for the keyring, with the first secret (Jira).

- Each worktree has an agent permission mode (ask for everything, ask for risky actions, allow all), "ask for everything" until set from the palette. A provider applies it where the agent supports it, by mapping each mode to values of one of the agent's config options in its manifest. Core sets it when a chat's agent starts or resumes and when the worktree's mode changes; an agent that offers none of a mode's values stays in its own mode. The chat header shows, next to the model, the mode the agent is really in (`docs/decisions/0038-permission-modes.md`).
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

- The app-level files are `settings.json` and `keybindings.json` in the app's config folder (`~/.config/yaa` on Linux, `~/.config/yaa-dev` in dev mode). They are plain JSON (`docs/decisions/0020-settings-files-json.md`). A missing or blank file means the defaults.
- `settings.json` is one object keyed `namespace.name`. Each setting has a schema with a default and a spec, which the settings screen renders: core's are in `contracts`, a plugin's in its manifest (`03-plugins.md`), keyed under its id. A value its schema rejects falls back to the default, and an unknown key is ignored; both are reported as problems, and the rest of the file applies. A file that is not a JSON object applies no settings.
- `keybindings.json` is an array of `{ "key", "command", "when", "global" }` entries, `when` and `global` optional. `key` is lower-case modifiers (`ctrl`, `shift`, `alt`, `meta`) and a key name joined by `+`, for example `ctrl+shift+p`. User entries are checked before the defaults, and a command starting with `-` removes the default binding with that key and command. Modifiers may come in any order. An entry with a mistake, an unknown field or a `when` that does not parse included, is dropped and reported; the others apply. How a key resolves is in `01-ui-layout-theming.md`.
- Core reads both files at start and watches them, so a save applies without a restart. When a save changes what a file resolves to, core sends the new state with its problems to every subscribed client. Problems are logged as warnings.

## Settings screen

Lands in: M3 (moved ahead of M6 so features add their options as they land: `docs/decisions/0038-settings-screen.md`).

- Opened with Ctrl , or the settings button at the foot of the left menu, and closed with the same key or Back to app. While it is open the left menu lists its pages, core's (Appearance, Worktrees, Keyboard) and then one per plugin with settings, under a search field; the grid's place shows the page, the header's panel bar hides, and the header's path reads Settings, then the page. The grid keeps its state underneath.
- A page has titled groups of settings. Each row shows the setting's title, description and control, and a reset button while the value is not the default. Controls follow the spec's type: a switch, a number with step buttons and its unit, a text field, side-by-side options for a choice of up to three and a list for more, a colour swatch with its hex value, or a grid of fields for a list of texts. A setting whose `enabledBy` switch is off is dimmed and disabled.
- The search keeps the settings whose page, group, key, title or description hold every typed word, across all pages.
- A change applies at once and is written to `settings.json` (`settings.set`); a value equal to its default is taken out of the file. A file that does not parse is left for the user to fix, and the change is refused with a message in the footer. The page lists the file's problems above the settings.
- Plugin panels get every setting's value, and each change, through `panel.settings` (`03-plugins.md`); a panel renders only once they are read.

## Logs and debug panel

Lands in: M1 for log files; M2 for the debug panel.

Core, plugin host, agent protocol and workflow logs go to one place with levels and filters, shown in a debug panel and written to files with rotation. The same logs feed the plugin-authoring tools for agents.

- The core writes the file. Main and the plugin host send their lines to it, each line tagged with its source (main, core, plugin host, agent, workflow); a line main logs while the core restarts reaches the next core.
- One JSON object per line in `yaa.log` in the app's log folder (`~/.config/yaa/logs` on Linux), written synchronously so the lines before a crash are on disk. The file rotates at 5 MB and the last three rotated files are kept (`yaa.1.log` is the newest).
- A line may name the worktree it is about, such as a setup step's output, an agent's stderr and protocol, a terminal or a file watch.
- Levels are debug, info, warn and error. Production writes info and above; dev mode writes debug too and echoes every line to the terminal. An uncaught exception in the core is logged before the core exits and main restarts it. A core that exits before it is ready, for example on a database from a newer app, is not restarted: main shows an error naming the log file and quits.
- Core keeps the last 10,000 lines in memory at every level, debug included in production, numbered so a client that reads them while new ones arrive gets each once. They go with the core when it restarts; the file has the rest.
- The debug panel, the built-in `debug` plugin, shows them as they arrive, at the end unless scrolled up: time, level, source, message and data. Filters pick a minimum level (info and above at first), one source or all, and the panel's worktree or all; each opens from the palette by command too.

## Plugin API versions and licence

Lands in: M6.

- The manifest declares the plugin API version it targets, and the plugin manager refuses or warns on a mismatch. It also checks the Svelte version a plugin was built with (see `03-plugins.md`). Plugins are installed by placing a folder in the plugin directory; there is no marketplace.
- The app sends no telemetry. The licence is MIT (`docs/decisions/0001-licence-mit.md`). Third-party licences are collected into a generated notices file that ships with the app, and CI fails when a dependency has a licence outside an allow-list (MIT, ISC, BSD, Apache-2.0, OFL for fonts).
