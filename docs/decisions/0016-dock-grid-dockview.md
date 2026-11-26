# 0016 Dock grid: dockview-core with our own Svelte adapter

Status: decided, 2026-11-26. M0 spike, branch `spike/dock-grid` (spike app and probe scripts in `spikes/dock-grid/`, kept for reference, not merged).

Context: the centre grid must let users drag panels to rearrange, split, tab and resize them, save a layout per project, restyle from tokens, and move focus and panels by keyboard (`docs/spec/01-ui-layout-theming.md`). The question was whether an existing docking library fits Svelte 5 or whether we build our own.

Versions: `dockview-core` 8.9.1 (8.10.0 was a day old and blocked by pnpm's minimum release age), Svelte 5.59.1, Vite 8.3.8, `@sveltejs/vite-plugin-svelte` 7.3.2. The production build was driven by `playwright-core` 1.65.1 in Chromium 158 on Linux. Electron itself was not used.

## Candidates

| Library | Verdict |
| --- | --- |
| `dockview-core` 8.9.1 | tested, fits. MIT, no runtime dependencies, framework-agnostic, released weekly |
| `dockview-svelte` 1.0.2 | not used: a one-person wrapper that depends on the React `dockview` package. Our adapter is about 80 lines |
| `golden-layout` 2.6.0 | rejected: last release February 2023 |
| `flexlayout-react`, `rc-dock` | rejected: React only |
| `@lumino/widgets` 2.10 | rejected: brings its own widget and message model, BSD-3 |
| `paneforge` 1.0.2 | resizable panes only, no tabs or drag-and-drop. It would only be a base for a custom grid |

A custom grid would need a split tree, tabs, drop zones with an overlay, sashes, serialization and directional navigation. dockview already does all of these, so we did not build one.

## Findings

- **Svelte 5 panels:** two ways were tested, and both work. In the first, `createComponent` returns a renderer that calls Svelte's `mount` with a `$state` props object and the host's `getAllContexts()`. In the second, which `docs/decisions/0015-plugin-ui-loading.md` needs, the renderer only adds a slot (id, kind, element, params, visible) to a `$state` list. A host component in the app's tree renders each slot's component inside a `<svelte:boundary>` and moves its root node into dockview's element with an attachment. Context flows in, `update` reaches the props, and a panel that throws shows its boundary fallback while the others keep running. The panel roots end up in dockview's overlay container, not under `.dv-dockview`. `createTabComponent` with `defaultTabComponent` renders our own Svelte tab (icon, title, close). Without `defaultTabComponent`, dockview silently uses its built-in tab.
- **Drag and drop:** with dockview's HTML5 drag-and-drop, dropping a tab on a tab strip or in the centre of a group adds it as a tab, and dropping on a group's edge splits it. Moving a panel between groups keeps the same component instance: no remount, and its state, an input value and a counter in the probe, survives.
- **Resize:** dragging a sash resized the group (347 to 425 px for an 80 px drag).
- **Keyboard:** `api.adjacentGroupInDirection(group, 'left' | 'right' | 'up' | 'down')` gives directional focus, `panel.api.moveTo({ group, position })` moves or splits a panel, and `panel.api.close()` closes it. All three were driven from one window key handler standing in for our keybinding dispatcher. dockview's own keyboard module is opt-in (`keyboardNavigation`, off by default). The tab strip still handles arrow keys, Home, End, Enter, Space, Delete and Backspace when a tab element itself has DOM focus (an ARIA tab list). Keys typed in panel content are not touched.
- **Layout switch** (8 panels in 5 groups against the 4-panel default, 20 alternations, panels rendering 200 rows each): `fromJSON` takes 4 to 8 ms (median), and the next frame is painted 16 to 17 ms after the call (22 ms worst), with either way of rendering panels. With `reuseExistingPanels: true`, only the panels that differ are mounted (40 mounts against 120 without it). The serialized layout is 0.9 to 1.6 KB of JSON.
- **First layout:** 4 panels were on screen 89 ms after `page.goto`.
- **Looks:** dockview reads about 100 `--dv-*` CSS variables. One theme class maps our tokens onto them, and `gap: 0` gives flat panels with 1 px hairlines. The groups cover the grid with no gaps. dockview sets `dv-active-group` on the active group, which carries the 1 px accent line.
- **Size:** `dockview-core` minified ESM is 403 KB, 94 KB gzipped, and is not tree-shaken much. The spike bundle with Svelte was 404 KB, 103 KB gzipped.
- **Stylesheet:** the `dockview-core` package has shipped no CSS file since at least 8.8.3, and its ESM build injects none. The stylesheet (161 KB, 13 KB gzipped, including about 18 built-in themes) is only in the React `dockview` package at `dist/styles/dockview.css`. `dockview` depends only on `dockview-core` and declares no React peer dependency.
- **Not verified:** Electron, Wayland and HiDPI; floating groups and popout windows (left off); heavy panels such as Monaco and the terminal inside a group; dragging between windows.

## Decision

- The centre grid uses `dockview-core`, pinned to an exact version, through a thin adapter of our own in the `ui` package. No third-party Svelte wrapper.
- Panels from core and plugins render inside the app's tree: `createComponent` registers a slot, and a panel host renders the slot's component in a boundary and moves its root into dockview's element. Group headers use our own Svelte tab via `defaultTabComponent`; the panel menu goes in the tab or in `createRightHeaderActionComponent`.
- Styling is one theme class that maps tokens to `--dv-*` variables, with `gap: 0`. The base stylesheet comes from the `dockview` package pinned to the same version as `dockview-core`, imported as CSS only.
- Options: `disableFloatingGroups: true`, no popouts, `keyboardNavigation` off. Focus, move, split and close are app commands built on `adjacentGroupInDirection`, `moveTo` and `close`, so keybindings stay with our dispatcher.
- Panels that hold expensive state, such as the terminal, Monaco and chat, use the `always` renderer so a hidden tab keeps its DOM. Others may use `onlyWhenVisible`.
- Layouts are stored with `toJSON` and restored with `fromJSON`, using `reuseExistingPanels` on a worktree switch.

## Consequences for M1

- The adapter owns the slot list, the panel host and the tab component. The slot list must only grow and shrink, never reorder, because a keyed `{#each}` that moves an item would likely move the panel's root node back out of dockview (unverified). Plugin panels never import `dockview-core`; they contribute a panel kind (id, title, icon, component) as `docs/spec/03-plugins.md` describes.
- dockview remembers nothing about a closed panel. Reopening a panel from the right rail where it was needs a last-position record per panel kind, kept by the app.
- The tab strip's own key handling, active only while a tab element has DOM focus, must agree with the shared list and tab navigation helper. M1 either accepts it as that helper for tabs or stops tabs from taking focus.
- When upgrading dockview, check that `dockview/dist/styles/dockview.css` still exists and that the `--dv-*` variable names have not changed.
