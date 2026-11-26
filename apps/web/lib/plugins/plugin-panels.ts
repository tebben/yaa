import type { Component } from "svelte";
import { createContext } from "svelte";

// What a plugin panel needs from the app: the component a panel kind's
// plugin exports, loaded on first use. App-wide, so it travels by context
// into every dock slot.
export type PluginPanels = { load(kind: string): Promise<Component> };

export const [getPluginPanels, setPluginPanels] = createContext<PluginPanels>();
