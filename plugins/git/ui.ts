import type { PluginUi } from "@yaa/plugin-api/ui";
import GitPanel from "./lib/GitPanel.svelte";

export const panels: PluginUi["panels"] = { git: GitPanel };
