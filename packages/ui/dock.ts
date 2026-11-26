// The dock grid: dockview-core behind a Svelte adapter
// (docs/decisions/0016-dock-grid-dockview.md). An entry of its own, so the
// ui entry that plugins share stays free of dockview: plugins contribute
// panel kinds, never the grid.
export { default as Dock } from "./lib/dock/Dock.svelte";
export {
	createDock,
	type DockController,
	type DockDirection,
	type DockOptions,
	type DockPlacement,
	type PanelKind,
	type PanelProps,
} from "./lib/dock/dock.svelte.ts";
export { parseDockLayout } from "./lib/dock/dock-layout.ts";
export { type Box, neighbour } from "./lib/dock/neighbour.ts";
