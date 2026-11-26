# 0030 The editor: Monaco in a plugin, and what the plugin API gained

Status: decided, 2026-11-26.

Context: the editor (M3 step 2) is the first plugin with a large UI library, tabs in place of a panel title, files opened by other plugins, and state that must survive a restart.

Decision:
- **Monaco 0.58.0**, bundled into the editor plugin's UI module with every editor feature and the syntax grammars. Of the language services only JSON's is in, because it is what highlights JSON. The TypeScript, CSS and HTML services are out: without the project's files loaded, the TypeScript one reports errors that are not there.
- **Workers from blob URLs.** The page cannot start a worker from the plugin's origin, so the plugin build embeds a worker's source (`?worker`) and starts it from a blob. The CSP gains `worker-src blob:`, and `font-src data:` for Monaco's icon font, which the build puts into the CSS file.
- **Opening files.** A panel declares `opensFiles` and takes requests; any panel calls `openFile`. The caller does not know the editor. Rejected: plugin services, which are for backends and need a declared dependency.
- **Header, close and palette.** The dock lets a panel fill its header and answer close by command first; a panel can show a list in the app's palette; a command can `reveal` its panel. Rejected: a second tab row under the panel title, and a picker of the editor's own.
- **Saving.** Reads and writes carry a hash of the file's bytes, so an agent's change is never written over unasked. Rejected: modification times, which miss changes within their resolution.
- **Unsaved text** goes to plugin storage 300 ms after typing pauses. Rejected: asking before the panel closes or the app quits, which a crash would skip.

Consequences: the editor's UI module is about 5.5 MB, loaded when an editor first renders. No completion or diagnostics beyond Monaco's word suggestions and JSON; no Svelte or TOML highlighting. The app's Ctrl H, J, K and L move focus inside the editor too, over Monaco's own bindings, until a user rebinds them. Typing in the last 300 ms before the app is killed is lost. Finishing a worktree drops its unsaved text.
