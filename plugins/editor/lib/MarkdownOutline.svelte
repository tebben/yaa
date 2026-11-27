<script lang="ts">
import type { MarkdownHeading } from "./markdown.ts";

let {
	headings,
	onselect,
}: {
	headings: readonly MarkdownHeading[];
	onselect: (id: string) => void;
} = $props();
</script>

<nav aria-label="Table of contents" class="toc">
	{#each headings as heading (heading.id)}
		<button
			type="button"
			style:padding-left={`calc(${heading.depth - 1} * var(--spacing-3))`}
			onclick={() => onselect(heading.id)}
		>
			{heading.text}
		</button>
	{:else}
		<p>No headings</p>
	{/each}
</nav>

<style>
.toc {
	display: flex;
	flex: 0 1 var(--spacing-field);
	flex-direction: column;
	gap: var(--spacing-1);
	overflow: auto;
	padding: var(--spacing-2);
	border-left: 1px solid var(--color-border);
}
.toc button {
	text-align: left;
	color: var(--color-text-soft);
}
.toc button:hover {
	color: var(--color-text);
}
</style>
