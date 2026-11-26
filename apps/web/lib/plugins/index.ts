// Plugins in the renderer: the shared modules, plugin panels, commands and
// keys (docs/spec/03-plugins.md).
export { setPanelWorktree, setPluginPanels } from "./plugin-panels.ts";
export { createPlugins, type PluginsController } from "./plugins.svelte.ts";
export { shareModules } from "./shared-modules.ts";
