<script lang="ts">
import { changeLines } from "./change-lines.ts";
import { worktreeFile } from "./file-reference.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// A file edit as an inline diff, under the file's path and how much changed.
let {
	path,
	oldText,
	newText,
	view,
}: {
	path: string;
	oldText?: string | undefined;
	newText: string;
	view: TranscriptView;
} = $props();

const lines = $derived(changeLines(oldText, newText));
const added = $derived(lines.filter(({ kind }) => kind === "added").length);
const removed = $derived(lines.filter(({ kind }) => kind === "removed").length);
const file = $derived(worktreeFile(path, view.root));
const marks = { added: "+", removed: "-", context: " ", gap: " " } as const;
</script>

<figure>
	<figcaption>
		{#if file}
			<button type="button" onclick={() => view.openFile(file)}>{file}</button>
		{:else}
			<span>{path}</span>
		{/if}
		<span class="added-count">+{added}</span>
		<span class="removed-count">−{removed}</span>
	</figcaption>
	<pre
	><code>{#each lines as line, index (index)}<span class={["line", line.kind]}>{marks[line.kind]} {line.text}</span>{/each}</code></pre>
</figure>

<style>
figure {
	overflow: hidden;
	border-radius: var(--radius-control);
	background: var(--color-chrome);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
}

figcaption {
	display: flex;
	gap: var(--spacing-2);
	padding: var(--spacing-1) var(--spacing-2_5);
	border-bottom: 1px solid var(--color-border);
	color: var(--color-text-soft);
}

figcaption > :first-child {
	overflow: hidden;
	margin-right: auto;
	text-overflow: ellipsis;
	white-space: nowrap;
}

button {
	outline-color: var(--color-focus);
}

button:hover {
	text-decoration: underline;
}

.added-count {
	color: var(--color-state-done);
}

.removed-count {
	color: var(--color-state-error);
}

pre {
	max-height: calc(var(--spacing-row) * 14);
	overflow: auto;
	padding: var(--spacing-1) 0;
	line-height: var(--leading-tight);
}

/* As wide as the longest line, so a line's tint reaches the end of it. */
code {
	display: block;
	width: max-content;
	min-width: 100%;
}

.line {
	display: block;
	padding: 0 var(--spacing-2_5);
}

.added {
	background: var(--color-diff-added);
}

.removed {
	background: var(--color-diff-removed);
}

.context,
.gap {
	color: var(--color-text-muted);
}
</style>
