<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Plugin system

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
| Agent providers | detection, models, sessions for an agent CLI |
| Chat renderers | custom rendering for a message part or tool-call kind |
| Editor extensions | Monaco decorations, gutter actions, widgets |
| Context menu items | actions on files, worktrees, issues and messages |

**API surface**

- A typed context object gives access to commands, views, settings, storage, git, worktrees, agent sessions and the event bus.
- **Events:** core emits typed events (`worktree.*`, `agent.*`, `git.*`, including agent questions, permission requests, tool calls and usage). Plugins subscribe, and may emit their own events under their namespace. This is how a plugin can show a questionnaire panel when an agent asks a question, or a panel of the skills an agent loaded.
- **Services:** a plugin exposes functions to others with `services.expose(name, api)`. Consumers declare the dependency in their manifest and receive a versioned handle, so load order is resolved by the manager.

**Process model**

Backend plugin code runs in a separate plugin host process, so a crashing plugin does not take down the core or the agents. UI modules run in the renderer. Both are loaded lazily on their activation events.

**Hot reload**

- In dev mode only, a watcher on the plugin folders reloads a plugin on change: the backend module is deactivated (every registration is a disposable, so cleanup is automatic) and re-imported; the UI module is swapped in place.
- Plugin state lives in storage, not in module memory, so a reload is invisible to the user.
- A failed load keeps the previous version running and shows the error in a plugin manager panel.
- Plugin UI in Svelte needs a build step, so dev mode bundles a compiler (for example Vite or esbuild with the Svelte plugin) in the plugin host. Production builds load prebuilt plugins, with no watcher and no compiler; installing or updating a plugin takes effect after a restart.

**Agent-authored plugins**

- Plugins live in a user folder and in an optional per-project folder.
- The app ships a skill and a small tool set for agents: scaffold a plugin from a template, read the typed API reference, validate the manifest and types, and tail the plugin's logs and load errors.
- After each save the reload result (success, type errors, runtime errors) is returned to the agent, so it can iterate without the user in the loop.
