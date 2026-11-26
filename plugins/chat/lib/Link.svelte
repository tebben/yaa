<script lang="ts">
import type { Snippet } from "svelte";
import { linkedFile } from "./file-reference.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// A link in an agent's markdown: a web address opens in the browser, a file
// of the worktree in the editor, and anything else is only its text.
let {
	href,
	view,
	children,
}: { href: string; view: TranscriptView; children: Snippet } = $props();

const web = $derived(/^https?:\/\//i.test(href));
const file = $derived(web ? undefined : linkedFile(href, view.root));
</script>

{#if web}
	<a {href} title={href} target="_blank" rel="noreferrer">
		{@render children()}
	</a>
{:else if file}
	<button
		type="button"
		title={href}
		onclick={() => view.openFile(file.path, file.line)}
	>
		{@render children()}
	</button>
{:else}
	{@render children()}
{/if}

<style>
a,
button {
	color: var(--color-accent);
	text-decoration: underline;
	outline-color: var(--color-focus);
}

button {
	user-select: text;
}
</style>
