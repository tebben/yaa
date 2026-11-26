<script lang="ts">
import type { Token } from "marked";
import { mentionedFile } from "./file-reference.ts";
import Link from "./Link.svelte";
import { markedTokens } from "./markdown-tokens.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// The inline part of an agent's markdown.
let { tokens, view }: { tokens: Token[]; view: TranscriptView } = $props();
</script>

{#snippet inline(list: Token[])}
	{#each markedTokens(list) as token, index (index)}
		{#if token.type === "strong"}
			<strong>{@render inline(token.tokens)}</strong>
		{:else if token.type === "em"}
			<em>{@render inline(token.tokens)}</em>
		{:else if token.type === "del"}
			<del>{@render inline(token.tokens)}</del>
		{:else if token.type === "br"}
			<br>
		{:else if token.type === "codespan"}
			{@const file = mentionedFile(token.text, view.root)}
			{#if file}
				<button
					type="button"
					class="file"
					onclick={() => view.openFile(file.path, file.line)}
				>
					<code>{token.text}</code>
				</button>
			{:else}
				<code>{token.text}</code>
			{/if}
		{:else if token.type === "link"}
			<Link href={token.href} {view}>{@render inline(token.tokens)}</Link>
		{:else if token.type === "image"}
			<Link href={token.href} {view}>{token.text || token.href}</Link>
		{:else if token.type === "text" && token.tokens}
			{@render inline(token.tokens)}
		{:else if token.type === "checkbox"}
			<input type="checkbox" checked={token.checked} disabled>
		{:else if token.type === "text" ||
			token.type === "escape" ||
			token.type === "html"}
			{token.text}
		{/if}
	{/each}
{/snippet}

{@render inline(tokens)}

<style>
code {
	padding: 0 var(--spacing-0_5);
	border-radius: var(--radius-chip);
	background: var(--color-raised);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
}

.file code {
	color: var(--color-accent);
}

.file {
	outline-color: var(--color-focus);
	user-select: text;
}

.file:hover code {
	text-decoration: underline;
}
</style>
