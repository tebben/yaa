import type { PanelContext, PanelProps } from "@yaa/plugin-api/ui";
import type { PanelFrame } from "@yaa/ui/dock";
import type { Component } from "svelte";
import { createContext } from "svelte";

// One plugin panel as it opens: the context its component gets, the
// component once the plugin's UI module has loaded, and what to dispose
// when the panel closes.
export type MountedPanel = {
	context: PanelContext;
	component: Promise<Component<PanelProps>>;
	dispose(): void;
};

// What a plugin panel needs from the app. App-wide, so it travels by context
// into every dock slot.
export type PluginPanels = {
	mount(kind: string, worktree: string, frame: PanelFrame): MountedPanel;
};

export const [getPluginPanels, setPluginPanels] = createContext<PluginPanels>();
