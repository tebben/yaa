<script lang="ts">
import type { PanelProps } from "@yaa/plugin-api/ui";
import { Button } from "@yaa/ui";
import { followEnd } from "@yaa/ui/scroll";
import { VList, type VListHandle } from "virtua/svelte";
import { createDebugPanel } from "./debug-panel.svelte.ts";
import LogLine from "./LogLine.svelte";

let { panel }: PanelProps = $props();
// A panel keeps its context for as long as it lives.
// svelte-ignore state_referenced_locally
const debug = createDebugPanel(panel);

let list = $state<VListHandle>();
const follow = followEnd(
	() => list,
	() => debug.shown,
);
</script>

<div class="debug">
	<div class="filters">
		<Button variant="ghost" title="Level" onclick={debug.pickers.level}>
			{debug.labels.level}
		</Button>
		<Button variant="ghost" title="Source" onclick={debug.pickers.source}>
			{debug.labels.source}
		</Button>
		<Button variant="ghost" title="Worktree" onclick={debug.pickers.worktree}>
			{debug.labels.worktree}
		</Button>
	</div>
	{#if debug.failure}
		<p class="failure" role="alert">{debug.failure}</p>
	{:else if debug.shown.length === 0}
		<p class="empty">No lines match the filters.</p>
	{:else}
		<div class="lines">
			<VList
				bind:this={list}
				data={debug.shown}
				style="height: 100%"
				onscroll={follow.scrolled}
				onresize={follow.toEnd}
			>
				{#snippet children(record)}
					<LogLine {record} />
				{/snippet}
			</VList>
		</div>
	{/if}
</div>

<style>
.debug {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.filters {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-1);
	padding: var(--spacing-1) var(--spacing-2);
	border-bottom: 1px solid var(--color-border);
}

.lines {
	flex: 1;
	min-height: 0;
}

.empty,
.failure {
	padding: var(--spacing-3);
	color: var(--color-text-muted);
}

.failure {
	color: var(--color-state-error);
}
</style>
