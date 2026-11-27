import type { PluginUi } from "@yaa/plugin-api/ui";
import McpSkillsPanel from "./lib/McpSkillsPanel.svelte";

export const panels: PluginUi["panels"] = { "mcp-skills": McpSkillsPanel };
