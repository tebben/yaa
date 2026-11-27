import type { PluginUi } from "@yaa/plugin-api/ui";
import DebugPanel from "./lib/DebugPanel.svelte";

export const panels: PluginUi["panels"] = { debug: DebugPanel };
