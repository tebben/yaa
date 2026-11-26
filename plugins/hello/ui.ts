import type { PluginUi } from "@yaa/plugin-api/ui";
import Hello from "./lib/Hello.svelte";

export const panels: PluginUi["panels"] = { hello: Hello };
