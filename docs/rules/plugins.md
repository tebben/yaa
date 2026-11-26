# Plugin rules

Source: `docs/spec/03-plugins.md`. The plugin API lands in M1 and stays unstable (`0.x`) until M6 (`docs/decisions/0011-plugin-api-unstable-until-m6.md`).

## Package
- A plugin is a folder in `plugins/` with a manifest (`plugin.json`) and up to two entry modules: a backend module (plugin host) and a UI module (Svelte, renderer).
- Manifest fields: id, version, activation events, contributions, dependencies on other plugins. The manifest is validated against its schema in `contracts`.
- A plugin is a deep module: other code sees only its manifest and entry modules (`packages/README.md`).

## Using the API
- Import only `plugin-api`, `contracts` and `ui`. Never core, never another plugin's internals, never Electron, Node or the transport behind the API's back. `lint:boundaries` fails on plugin imports of core.
- If the API lacks something, change the API: the type in `plugin-api` and `contracts`, the implementation in core, and every built-in plugin it breaks, in one change. No workarounds and no compatibility shims.
- Add through contribution points (panels, header and footer items, commands and keybindings, settings, connectors, agent providers, chat renderers, editor extensions, context menu items).
- Emit only events declared under the plugin's own namespace.
- Expose functions to other plugins as services with `services.expose(name, api)`. Consumers declare the dependency in their manifest.
- Agent providers return detection, spawn configuration and capabilities. Core runs the process and owns the ACP connection.

## Lifecycle and state
- Every registration returns a disposable. Dispose everything you register, so deactivation and hot reload clean up.
- Keep state in plugin storage, not module memory, so a reload is invisible.
- Load on activation events, not at startup.

## Look
- Style with `ui` components and token CSS variables. No colour or spacing literals. Icons from `@lucide/svelte` through `ui`.
- Never bundle a copy of `svelte` or `ui`; import the app's.
- Extra styles ship as one compiled, scoped CSS file declared in the manifest.
