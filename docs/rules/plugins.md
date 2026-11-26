# Plugin rules

Source: `docs/spec/03-plugins.md`. The plugin API lands in M1 and stays unstable (`0.x`) until M6 (`docs/decisions/0011-plugin-api-unstable-until-m6.md`).

## Package
- A plugin is a folder in `plugins/` with a manifest (`plugin.json`) and up to two entry modules: `main.ts`, the backend (plugin host), exporting `activate(context)`, and `ui.ts`, the UI (Svelte, renderer), exporting `panels`. `plugins/hello` is the example.
- Manifest fields: id (the folder's name), version, activation events, `main`, `ui` and `styles` (the built files), contributions. Dependencies on other plugins arrive with services. The schema is in `contracts` (`plugin-manifest.ts`).
- A command that acts on what a panel shows names it in `panel` and is registered by the component (`panel.commands.register`); bind its keys with `when: panel.kind == <panel> && focus.region == dock && !palette.open`, adding `!inputFocus` for keys that type or move in text. Never attach a key listener.
- Command and panel ids are `<plugin id>` or `<plugin id>.<name>`. A panel's icon is an SVG file in the plugin folder.
- Build with `pnpm run plugins:build` (all built-in plugins) or `yaa-plugin-build <folder>`; the output goes to the paths the manifest names.
- A plugin is a deep module: other code sees only its manifest and entry modules (`packages/README.md`).

## Using the API
- Import only `plugin-api`, `contracts`, `ui` and the pure helpers of `commands` (such as the fuzzy matcher). Never core, never another plugin's internals, never Electron, Node or the transport behind the API's back. `lint:boundaries` fails on plugin imports of core.
- If the API lacks something, change the API: the type in `plugin-api` and `contracts`, the implementation in core, and every built-in plugin it breaks, in one change. No workarounds and no compatibility shims.
- Add through contribution points (panels, header and footer items, commands and keybindings, settings, connectors, agent providers, chat renderers, editor extensions, context menu items).
- Emit only events declared under the plugin's own namespace.
- Expose functions to other plugins as services with `services.expose(name, api)`. Consumers declare the dependency in their manifest.
- Agent providers return detection, spawn configuration and capabilities. Core runs the process and owns the ACP connection.

## Lifecycle and state
- Every registration returns a disposable. Dispose everything you register, so deactivation and hot reload clean up.
- Keep state in plugin storage, not module memory, so a reload is invisible.
- Load on activation events, not at startup. A contributed command activates its plugin when it runs; list `onStartup` only when the plugin must run before anything asks for it.

## Look
- Style with `ui` components and token CSS variables. No colour or spacing literals. Icons from `@lucide/svelte` through `ui`.
- Never bundle a copy of `svelte` or `ui`; import the app's.
- Never rely on Tailwind classes: the app's build only contains the classes the app uses.
- Extra styles go in scoped `<style>` blocks; the plugin build extracts them into one CSS file declared in the manifest.
- Components use runes. Build plugin UI only with the yaa plugin build, which links it to the app's Svelte runtime (`docs/decisions/0015-plugin-ui-loading.md`).
