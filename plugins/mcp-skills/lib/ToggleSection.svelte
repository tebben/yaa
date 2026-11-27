<script lang="ts">
import type { ContextKind } from "@yaa/contracts/agent-context";
import { Button } from "@yaa/ui";
import type { ToggleList } from "./rows.ts";
import ToggleRow from "./ToggleRow.svelte";

let {
	list,
	onset,
}: {
	list: ToggleList & { kind: ContextKind; title: string };
	onset: (kind: ContextKind, name?: string, enabled?: boolean) => void;
} = $props();
</script>

<section aria-label={list.title}>
	<header>
		<h2>{list.title}</h2>
		<span class="count">{list.on} of {list.rows.length} on</span>
		{#if list.switchable}
			<div class="actions">
				<Button
					variant="ghost"
					onclick={() => onset(list.kind, undefined, true)}
				>
					Enable all
				</Button>
				<Button
					variant="ghost"
					onclick={() => onset(list.kind, undefined, false)}
				>
					Disable all
				</Button>
				<Button
					variant="ghost"
					title="Take off what is set here"
					disabled={!list.setHere}
					onclick={() => onset(list.kind)}
				>
					Reset
				</Button>
			</div>
		{/if}
	</header>
	{#if list.rows.length === 0}
		<p class="empty">None found.</p>
	{:else}
		<ul>
			{#each list.rows as row (row.name)}
				<ToggleRow
					{row}
					onset={(enabled) => onset(list.kind, row.name, enabled)}
				/>
			{/each}
		</ul>
	{/if}
</section>

<style>
header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-2);
	/* A ghost button pads its label by 7px, border included: this puts the
	   last label on the 12px inset the rows end at. */
	padding: var(--spacing-1) calc(var(--spacing-3) - var(--spacing-1_5) - 1px)
		var(--spacing-1) var(--spacing-3);
	border-top: 1px solid var(--color-border);
	border-bottom: 1px solid var(--color-border);
}

h2 {
	font-size: var(--text-sm);
	font-weight: var(--font-weight-medium);
}

.count {
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}

.actions {
	display: flex;
	gap: var(--spacing-1);
	margin-left: auto;
}

.empty {
	padding: var(--spacing-1_5) var(--spacing-3);
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}
</style>
