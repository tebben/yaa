# 0015 Plugin UI loading, styles and hot reload

Status: decided, 2026-11-26. M0 spike, branch `spike/plugin-ui` (code in `spikes/plugin-ui/`, kept for reference, not merged).

Context: plugin UI must run on the app's single Svelte runtime, get styles the app's Tailwind build does not contain, and reload in dev mode without restarting the app (`docs/spec/03-plugins.md`, `0005-plugin-hot-reload-dev-only.md`). The spike built a small Electron app with a hardened renderer (context isolation, sandbox, CSP), a `ui` package with a button, and a plugin with a `.svelte` panel and a `.svelte.ts` controller. It ran in dev mode (Vite dev server, plugin host as a `utilityProcess` with a watcher) and in prod mode (Vite build served over a custom protocol, prebuilt plugin).

Versions: Electron 45.5.0, Svelte 5.59.1, esbuild 0.28.2, Vite 8.3.8 with `@sveltejs/vite-plugin-svelte` 7.3.2, Tailwind 4.3.5, Node 24.9, Linux.

## Findings

- **Import map shims do not work.** Svelte's compiled output does `import * as $ from 'svelte/internal/client'` and reads live bindings from it (for example `active_effect`, an `export let`). A shim module behind an import map can only copy the exports, so those values go stale.
- **What works:** the app puts the real module namespaces of the shared specifiers in a registry on `globalThis`. The plugin build (esbuild plus the Svelte compiler) resolves each shared specifier to a stub that reads the registry, so plugin code calls the app's runtime through the live namespace. The same output loads in dev and prod.
- **One runtime, verified:** the plugin's `getContext` read the app's context, `ui` components used from the plugin read it too, app state passed as props and through context updated the plugin, and `svelte/transition` and `svelte/reactivity` worked. The plugin bundle is 6.5 KB with no runtime inside.
- **Compiled output also imports private specifiers:** `svelte/internal/client` and `svelte/internal/init-operations` (side effect only, already run by the app). Svelte's compiler rejects `svelte/internal/*` imports in plugin source, so plugins cannot reach the runtime flags. A public specifier the app does not share fails at load with a clear error.
- **Cost:** sharing defeats tree-shaking of the runtime. The app bundle grew from 49.8 KB to 123.5 KB minified (19.4 to 45.8 KB gzip) when sharing `svelte`, `svelte/store`, `reactivity`, `transition`, `easing` and `events`.
- **Coupling:** compiled plugin code calls Svelte's internal API, which changes between Svelte releases. A plugin built with one Svelte version is not safe to run on another.
- **Styles:** a Tailwind class only the plugin uses has no effect, as expected. A class the app also uses applies, but only by coincidence. Token CSS variables and `ui` components style plugins correctly. Svelte's scoped component `<style>` blocks, extracted by the plugin build into one `ui.css` and loaded with a `<link>`, are the plugin's own scoped CSS file.
- **Hot reload (20 edits):** 31 ms median from file write to the new version in the DOM: 20 ms watcher debounce, 8 ms rebuild (esbuild incremental context; 33 ms for the first build), 3 ms import and swap. Swapping means importing the module with a new version query, loading the new CSS before removing the old, and setting the panel's component.
- **State:** values in app-provided storage survived every reload; component state reset, as the spec intends.
- **Failures:** a syntax error kept the previous version running and reported the compiler message. A component that throws while rendering was caught by a `<svelte:boundary>` around the panel. A failed boundary stays failed when a new version is swapped in, so the boundary has to be keyed by the plugin version.
- **Memory:** neither the renderer nor Node ever evicts an imported module. Renderer heap grew by about 60 KB per reload of this plugin (6.6 to 13.1 MB over 100 reloads), and Node by about 12 KB per reload of a 6 KB backend module. Acceptable for dev mode; reloading the window frees it.
- **Dev tooling size:** esbuild's binary is 11 MB, the Svelte compiler under 1 MB. Neither is needed in production.
- Not verified: Svelte's own HMR (`compilerOptions.hmr`), which would keep component state but needs Vite's HMR client; plugins with several entry chunks; a plugin's backend module in a real plugin host.

## Decision

- The app exposes a shared-module registry: the real namespaces of every public client entry of `svelte` (`svelte`, `svelte/store`, `svelte/reactivity`, `svelte/transition`, `svelte/animate`, `svelte/easing`, `svelte/motion`, `svelte/events`, `svelte/attachments`), the private entries compiled code imports, and the `ui` package. No import maps.
- Plugins are built by one yaa plugin build (esbuild plus the Svelte compiler) that maps shared specifiers to the registry and compiles with `runes: true`, `discloseVersion: false` and `css: 'external'`. Dev mode runs it as an incremental watcher in the plugin host; prebuilt plugins use the same build.
- The build stamps the Svelte version into the output. The loader refuses a plugin built with a different Svelte version and shows the error in the plugin manager (proposed; how third-party plugins follow app upgrades is open until the M6 freeze).
- Plugin styles: `ui` components, token CSS variables and scoped `<style>` blocks, which the build extracts into the plugin's CSS file. Plugins never rely on Tailwind classes.
- Plugin UI modules are served over a custom protocol the CSP allows. Each panel renders inside a `<svelte:boundary>` keyed by the plugin version.
- Hot reload swaps by re-importing with a version query. The module leak is accepted in dev mode.

## Consequences for M1

- `apps/web` owns the registry and loads it before any plugin; `ui` must be an entry point it can register whole.
- The panel host renders plugin panels as dynamic components inside the app's tree, not with a separate `mount`, so context flows in.
- The plugin build lives in one package that both dev mode and the production build of built-in plugins use.
