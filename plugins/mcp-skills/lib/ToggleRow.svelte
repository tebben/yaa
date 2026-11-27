<script lang="ts">
import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
import { IconButton, Switch } from "@yaa/ui";
import { rowNotes } from "./row-notes.ts";
import type { Row } from "./rows.ts";

// One MCP server or skill. `onset` without a value takes the setting off.
let {
	row,
	onset,
}: {
	row: Row;
	onset: (enabled?: boolean) => void;
} = $props();
</script>

<li>
	<div class="text" title={row.sources.join("\n")}>
		<span class="name">{row.name}</span>
		<span class="notes">{rowNotes(row).join(" · ")}</span>
		{#if row.description}
			<span class="description">{row.description}</span>
		{/if}
	</div>
	{#if row.setHere}
		<IconButton
			icon={RotateCcw}
			label={`Take off the setting of ${row.name}`}
			onclick={() => onset()}
		/>
	{/if}
	{#if row.switchable}
		<Switch checked={row.enabled} label={row.name} onchange={onset} />
	{/if}
</li>

<style>
li {
	display: flex;
	align-items: center;
	gap: var(--spacing-2);
	padding: var(--spacing-1_5) var(--spacing-3);
}

li:hover {
	background: var(--color-hover);
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.name,
.description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.name {
	font-family: var(--font-mono);
}

.notes,
.description {
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}
</style>
