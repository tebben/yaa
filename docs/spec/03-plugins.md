<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Plugin system

Lands in: M1 for the host and the first contribution points; the API grows through M4 and is frozen in M6 (`docs/decisions/0011-plugin-api-unstable-until-m6.md`). Dev-mode hot reload and the agent-authoring tools: M3.

Core provides the shell and a set of registries. Every feature, including the git panel, chat, files, terminal, GitHub and Jira, is a plugin that uses the same public API, so third-party and agent-written plugins have the same power as built-in ones. Trust model for v1: plugins run with full user permissions, like VS Code extensions, and declare what they use in the manifest for transparency; per-plugin permission prompts can be added later.

**Package**

A plugin is a folder with a manifest (`plugin.json`: id, version, activation events, contributions, dependencies on other plugins) and up to two entry modules: a backend module that runs in the plugin host process, and a UI module of Svelte components loaded in the renderer. Plugins import shared UI primitives from the app's design system so they match the look.

**Contribution points**

| Point | What a plugin adds |
| --- | --- |
| Panels | a view in the grid, scoped to the app, a project or a worktree |
| Header and footer items | components in named slots |
| Commands and keybindings | actions in the palette, default keys |
| Settings | a schema-rendered settings page, or a custom panel |
| Connectors | an issue-tracker or source-control implementation |
| Agent providers | detection, spawn configuration, capabilities and models for an agent CLI; core runs the process |
| Chat renderers | custom rendering for a message part or tool-call kind |
| Editor extensions | Monaco decorations, gutter actions, widgets |
| Context menu items | actions on files, worktrees, issues and messages |

**API surface**

- A typed context object gives access to commands, views, settings, storage, git, worktrees, agent sessions and the event bus.
- **Events:** core emits typed events (`worktree.*`, `agent.*`, `git.*`, including agent questions, permission requests, tool calls and usage). Plugins subscribe, and may emit their own events under their namespace. This is how a plugin can show a questionnaire panel when an agent asks a question, or a panel of the skills an agent loaded.
- **Services:** a plugin exposes functions to others with `services.expose(name, api)`. Consumers declare the dependency in their manifest and receive a versioned handle, so load order is resolved by the manager.

**Process model**

Backend plugin code runs in a separate plugin host process, so a crashing plugin does not take down the core or the agents. Agent processes and PTYs belong to core, not to the plugin host (see `00-overview.md`). An agent provider plugin returns detection results, spawn configuration and capabilities; core starts the process and owns the ACP connection. UI modules run in the renderer. Both are loaded lazily on their activation events.

**Plugin UI in the renderer**

- Plugin UI runs on the app's single Svelte runtime and the app's `ui` package, never a bundled copy. Two Svelte runtimes in one page break context and reactivity. The app exposes a registry of the shared modules' real namespaces (every public client entry of `svelte`, the private entries compiled code imports, and `ui`), and the yaa plugin build compiles a plugin's imports of them into reads from that registry. Import maps do not work, because compiled Svelte code reads live bindings from the runtime (`docs/decisions/0015-plugin-ui-loading.md`).
- The plugin build (esbuild plus the Svelte compiler) compiles in runes mode and stamps the Svelte version into the output. The loader runs a plugin only on the exact Svelte version it was built with; on a mismatch the plugin manager refuses it and shows the command that rebuilds it. A plugin folder ships its built output beside its source, and third-party plugins are rebuilt when an app upgrade changes Svelte.
- The app's Tailwind CSS is compiled at app build time, so it does not contain classes that only a plugin uses. Plugins never rely on Tailwind classes: they style with `ui` components, the token CSS variables and scoped `<style>` blocks, which the plugin build extracts into one CSS file declared in the manifest.
- Plugin UI modules and styles are served over a custom protocol that the renderer's CSP allows. The app renders each plugin panel inside its own tree, so context reaches it, wrapped in an error boundary keyed by the plugin version, so a plugin that throws shows an error in its panel and a fixed version renders again.

**API stability**

The plugin API is public from M1: built-in, third-party and agent-written plugins all use it. Until the freeze in M6 it is unstable, version `0.x`, and changes whenever a plugin needs something it lacks.

- A plugin that needs a capability the API does not offer gets it by changing the API: add or change the type in `plugin-api` and `contracts`, implement it in core, and update every built-in plugin that the change breaks, in the same change.
- No workarounds: a plugin never imports core or another plugin's internals, never calls Electron, Node or the transport behind the API's back, never sends undeclared events, and never reimplements something core already does. The boundary lint enforces the import part.
- No compatibility shims before the freeze: a changed API is changed everywhere, not kept in two versions.
- At the freeze the API becomes `1.0`, and from then on manifests declare the version they target (see Plugin API versions in `11-platform-services.md`).

**Hot reload**

- In dev mode only, a watcher on the plugin folders reloads a plugin on change: the backend module is deactivated (every registration is a disposable, so cleanup is automatic) and re-imported; the UI module is re-imported under a new version and swapped in place, with its new CSS loaded before the old is removed. Imported modules are never evicted, so a long dev session grows memory until the window reloads.
- Plugin state lives in storage, not in module memory, so a reload is invisible to the user.
- A failed load keeps the previous version running and shows the error in a plugin manager panel.
- Plugin UI in Svelte needs a build step, so dev mode runs the plugin build as an incremental watcher in the plugin host. Production builds load prebuilt plugins, with no watcher and no compiler; installing or updating a plugin takes effect after a restart.

**Agent-authored plugins**

- Plugins live in a user folder and in an optional per-project folder.
- The app ships a skill and a small tool set for agents: scaffold a plugin from a template, read the typed API reference, validate the manifest and types, and tail the plugin's logs and load errors.
- After each save the reload result (success, type errors, runtime errors) is returned to the agent, so it can iterate without the user in the loop.
