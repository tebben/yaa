# Dock grid spike

Svelte 5 panels inside dockview-core 8.9.1. Result: `docs/decisions/0015-dock-grid-dockview.md` on main.

- `pnpm install --ignore-workspace && pnpm exec vite build`
- `node probe.mjs` drives the build in Chromium (`/usr/bin/chromium`) and prints what works and the layout-switch timings; `probe-center.mjs` checks dropping a tab in the centre of a group. `probe-dom.mjs` checks where in-tree panels land and that a failing panel stays inside its boundary. Screenshots land in `shots/`.
- Panels render inside the app's tree (`PanelHost.svelte`) and an attachment moves each root node into dockview's element. The first version used Svelte's `mount` with `getAllContexts()`; it is in the first commit on this branch.
- `vendor/dockview-8.9.1.css` is copied from the `dockview` package, because `dockview-core` ships no stylesheet.
