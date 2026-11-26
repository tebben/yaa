import type { PluginUi } from "@yaa/plugin-api/ui";
import ChatPanel from "./lib/ChatPanel.svelte";

export const panels: PluginUi["panels"] = { chat: ChatPanel };
