<script lang="ts">
import { highlight } from "./highlight.ts";

// A fenced code block, highlighted once it is whole and on screen.
let {
	code,
	language,
	done,
}: { code: string; language: string; done: boolean } = $props();

// A fence's info line starts with the language.
const lines = $derived(
	done
		? highlight(code, language.split(/\s/)[0]?.toLowerCase() ?? "")
		: undefined,
);
</script>

{#await lines}
	<pre><code>{code}</code></pre>
{:then tokens}
	{#if tokens}
		<pre
		><code>{#each tokens as line, index (index)}{#if index > 0}{"\n"}{/if}{#each line as token, at (at)}<span style:color={token.color}>{token.content}</span>{/each}{/each}</code></pre>
	{:else}
		<pre><code>{code}</code></pre>
	{/if}
{:catch}
	<!-- A grammar that fails leaves the code readable. -->
	<pre><code>{code}</code></pre>
{/await}

<style>
pre {
	/* The highlighter's colours, from the theme's syntax tokens. */
	--yaa-code-foreground: var(--color-text);
	--yaa-code-token-keyword: var(--color-syntax-keyword);
	--yaa-code-token-string: var(--color-syntax-string);
	--yaa-code-token-string-expression: var(--color-syntax-string);
	--yaa-code-token-constant: var(--color-syntax-number);
	--yaa-code-token-comment: var(--color-syntax-comment);
	--yaa-code-token-function: var(--color-syntax-type);
	--yaa-code-token-parameter: var(--color-text);
	--yaa-code-token-punctuation: var(--color-text-soft);
	--yaa-code-token-link: var(--color-accent);
	overflow-x: auto;
	padding: var(--spacing-2) var(--spacing-2_5);
	border-radius: var(--radius-control);
	background: var(--color-chrome);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	line-height: var(--leading-tight);
	overflow-wrap: normal;
}
</style>
