<script lang="ts">
import type { Tokens } from "marked";
import Inline from "./Inline.svelte";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// A markdown table, which scrolls sideways when it is wider than the chat.
let { table, view }: { table: Tokens.Table; view: TranscriptView } = $props();
</script>

{#snippet cell(content: Tokens.TableCell, header: boolean)}
	<svelte:element
		this={header ? "th" : "td"}
		style:text-align={content.align ?? "left"}
	>
		<Inline tokens={content.tokens} {view} />
	</svelte:element>
{/snippet}

<div class="table">
	<table>
		<thead>
			<tr>
				{#each table.header as content, at (at)}
					{@render cell(content, true)}
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each table.rows as row, at (at)}
				<tr>
					{#each row as content, column (column)}
						{@render cell(content, false)}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
.table {
	overflow-x: auto;
}

table {
	border-collapse: collapse;
}

.table :global(:is(th, td)) {
	padding: var(--spacing-1) var(--spacing-2);
	border: 1px solid var(--color-border);
	overflow-wrap: normal;
}
</style>
