# 0029 The plugin API for worktrees, and file watching

Status: decided, 2026-11-26.

Context: the files panel (M3 step 1) is the first plugin that works on a worktree. It needed a panel that knows its worktree, calls from a UI module to its backend, git and file access for the backend, keys for a tree inside a panel, and a file watcher that stays cheap beside `node_modules` (`docs/spec/03-plugins.md`, `docs/spec/07-editor-files-terminal.md`).

Decision:
- **UI to backend.** A plugin defines its own protocol with `defineProtocol`; the backend serves it and a panel calls it. Core relays params, results and events without reading them, and each end checks them against the protocol. The protocol's events are the plugin's declared events, so the manifest lists none.
- **Plugin API over core.** The plugin host asks core for worktrees, git and file operations over the port core already uses to call the host, in a second typed protocol. Plugins do not run git or touch the folder themselves, so git's queue, path checks and watching stay in one place.
- **Panel commands.** A manifest command naming a `panel` runs in that panel's UI, for the open worktree, and can run only while that panel is there. Trees get their keys this way, so components still attach no key listeners.
- **Watching.** Core keeps one `fs.watch` per folder that git does not ignore, plus one on the checkout's git folder for the index and HEAD. Rejected: `fs.watch` with `recursive`, which on Linux also watches ignored trees; `@parcel/watcher` and `chokidar`, a dependency for what is about 150 lines here.

Consequences: a repository with more folders than `fs.inotify.max_user_watches` allows is listed but not updated, and the panel says so. Ignored folders are read when opened and again on the next change elsewhere. The whole list is read after each change, throttled to one report per 100 ms; revisit if large repositories make that slow.
