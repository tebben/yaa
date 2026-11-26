# Dock grid spike

Svelte 5 panels inside dockview-core 8.9.1. Result: `docs/decisions/0015-dock-grid-dockview.md` on main.

- `pnpm install --ignore-workspace && pnpm exec vite build`
- `node probe.mjs` drives the build in Chromium (`/usr/bin/chromium`) and prints what works and the layout-switch timings; `probe-center.mjs` checks dropping a tab in the centre of a group. Screenshots land in `shots/`.
- `vendor/dockview-8.9.1.css` is copied from the `dockview` package, because `dockview-core` ships no stylesheet.
