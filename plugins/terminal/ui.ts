import "@xterm/xterm/css/xterm.css";
import type { PluginUi } from "@yaa/plugin-api/ui";
import TerminalPanel from "./lib/TerminalPanel.svelte";

export const panels: PluginUi["panels"] = { terminal: TerminalPanel };
