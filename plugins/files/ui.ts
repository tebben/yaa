import type { PluginUi } from "@yaa/plugin-api/ui";
import FilesPanel from "./lib/FilesPanel.svelte";

export const panels: PluginUi["panels"] = { files: FilesPanel };
