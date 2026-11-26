<script lang="ts">
import type { MarkedToken } from "marked";
import CodeBlock from "./CodeBlock.svelte";
import Inline from "./Inline.svelte";
import { markedTokens, parseMarkdown } from "./markdown-tokens.ts";
import Table from "./Table.svelte";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// An agent's markdown. While it streams, the last block is not done, so code
// in it stays plain.
let {
	text,
	view,
	streaming,
}: { text: string; view: TranscriptView; streaming: boolean } = $props();

const tokens = $derived(parseMarkdown(text));
</script>

{#snippet blocks(list: MarkedToken[], open: boolean)}
	{#each list as token, index (index)}
		{#if token.type === "paragraph"}
			<p><Inline tokens={token.tokens} {view} /></p>
		{:else if token.type === "text"}
			{#if token.tokens}
				<Inline tokens={token.tokens} {view} />
			{:else}
				{token.text}
			{/if}
		{:else if token.type === "heading"}
			<svelte:element this={`h${token.depth}`}>
				<Inline tokens={token.tokens} {view} />
			</svelte:element>
		{:else if token.type === "code"}
			<CodeBlock
				code={token.text}
				language={token.lang ?? ""}
				done={!(open && index === list.length - 1)}
			/>
		{:else if token.type === "blockquote"}
			<blockquote>
				{@render blocks(markedTokens(token.tokens), false)}
			</blockquote>
		{:else if token.type === "list"}
			<svelte:element
				this={token.ordered ? "ol" : "ul"}
				start={token.start === "" ? undefined : token.start}
			>
				{#each token.items as item, at (at)}
					<li class={{ task: item.task }}>
						{@render blocks(markedTokens(item.tokens), false)}
					</li>
				{/each}
			</svelte:element>
		{:else if token.type === "checkbox"}
			<input type="checkbox" checked={token.checked} disabled>
		{:else if token.type === "table"}
			<Table table={token} {view} />
		{:else if token.type === "hr"}
			<hr>
		{:else if token.type === "html"}
			<p>{token.text}</p>
		{/if}
	{/each}
{/snippet}

<div class="markdown">{@render blocks(tokens, streaming)}</div>

<style>
.markdown {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2);
	overflow-wrap: anywhere;
}

h1,
h2,
h3,
h4,
h5,
h6 {
	font-size: var(--text-base);
	font-weight: var(--font-weight-semibold);
}

h1,
h2 {
	font-size: var(--text-lg);
}

ul,
ol {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-0_5);
	padding-left: var(--spacing-4_5);
}

ul {
	list-style: disc;
}

ol {
	list-style: decimal;
}

.task {
	list-style: none;
}

blockquote {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2);
	padding: var(--spacing-1) var(--spacing-2_5);
	border-radius: var(--radius-control);
	background: var(--color-raised);
	color: var(--color-text-soft);
}

hr {
	border: 0;
	border-top: 1px solid var(--color-border);
}
</style>
