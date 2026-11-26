import type { PluginUi } from "@yaa/plugin-api/ui";
import EditorPanel from "./lib/EditorPanel.svelte";

export const panels: PluginUi["panels"] = { editor: EditorPanel };
