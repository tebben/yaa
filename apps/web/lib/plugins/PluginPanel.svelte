<script lang="ts">
import type { PanelProps } from "@yaa/ui/dock";
import { getPluginPanels } from "./plugin-panels.ts";

// A panel a plugin contributes: its component once the plugin's UI module
// has loaded. A component that throws while rendering is caught by the
// dock's boundary around every panel.
let { kind }: PanelProps = $props();
const panels = getPluginPanels();
const panel = $derived(panels.load(kind));
</script>

{#await panel then Panel}
	<Panel />
{:catch error}
	<p class="p-3 text-state-error">{String(error)}</p>
{/await}
