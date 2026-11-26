<script lang="ts">
import { splitTitle, worktreeFile } from "./file-reference.ts";
import type { TranscriptItem } from "./transcript.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// A tool call's title, with the file it works on as a link: in place when
// the title names it, after the title when it does not.
let {
	item,
	view,
}: {
	item: Extract<TranscriptItem, { kind: "tool" }>;
	view: TranscriptView;
} = $props();

const file = $derived.by(() => {
	const [location] = item.locations;
	if (location === undefined) return undefined;
	const path = worktreeFile(location.path, view.root);
	return path === undefined ? undefined : { path, line: location.line };
});
const around = $derived(file && splitTitle(item.title, file.path));
</script>

{#snippet link(file: { path: string; line?: number | undefined })}
	<button type="button" onclick={() => view.openFile(file.path, file.line)}>
		{file.path}{file.line === undefined ? "" : `:${file.line}`}
	</button>
{/snippet}

<span class="title" title={item.title}>
	{#if file && around}
		{around[0]}{@render link(file)}{around[1]}
	{:else}
		{item.title}
		{#if file}
			{@render link(file)}
		{/if}
	{/if}
</span>

<style>
.title {
	overflow: hidden;
	color: var(--color-text-soft);
	text-overflow: ellipsis;
	white-space: nowrap;
}

button {
	color: var(--color-text);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	outline-color: var(--color-focus);
	user-select: text;
}

button:hover {
	text-decoration: underline;
}
</style>
