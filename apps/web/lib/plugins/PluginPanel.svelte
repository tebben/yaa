<script lang="ts">
import type { PanelProps } from "@yaa/ui/dock";
import { onDestroy, untrack } from "svelte";
import { getPanelWorktree } from "../panel-worktree.ts";
import { getPluginPanels } from "./plugin-panels.ts";

// A panel a plugin contributes: its component once the plugin's UI module
// has loaded. A component that throws while rendering is caught by the
// dock's boundary around every panel.
let { kind, frame }: PanelProps = $props();
// A slot keeps its kind, worktree and frame for as long as it lives.
const mounted = getPluginPanels().mount(
	untrack(() => kind),
	getPanelWorktree()(),
	untrack(() => frame),
);
onDestroy(mounted.dispose);
</script>

{#await mounted.component then Panel}
	<Panel panel={mounted.context} />
{:catch error}
	<p class="p-3 text-state-error">{String(error)}</p>
{/await}
