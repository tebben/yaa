<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import { Icon } from "@yaa/ui";
import Diff from "./Diff.svelte";
import ToolTitle from "./ToolTitle.svelte";
import { toolIcons } from "./tool-icons.ts";
import type { TranscriptItem } from "./transcript.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// A tool call with its status, its edits as diffs and, on demand, its
// output, which a failed call shows at once.
let {
	item,
	view,
}: {
	item: Extract<TranscriptItem, { kind: "tool" }>;
	view: TranscriptView;
} = $props();

const texts = $derived(
	item.output.flatMap((output) => (output.type === "text" ? output.text : [])),
);
const diffs = $derived(item.output.filter((output) => output.type === "diff"));
const failed = $derived(item.status === "failed");
const open = $derived(view.isOpen(item.key, failed));
const statuses = {
	pending: "waiting",
	in_progress: "running",
	completed: "",
	failed: "failed",
	stopped: "stopped",
} as const;
</script>

<div class="tool">
	<div class="row">
		<Icon icon={toolIcons[item.tool]} />
		<ToolTitle {item} {view} />
		<span class={["status", item.status]}>{statuses[item.status]}</span>
		{#if texts.length > 0}
			<button
				type="button"
				aria-expanded={open}
				aria-label={`Output of ${item.title}`}
				onclick={() => view.toggle(item.key, failed)}
			>
				<Icon icon={open ? ChevronDown : ChevronRight} />
			</button>
		{/if}
	</div>
	{#if open}
		{#each texts as text, index (index)}
			<pre>{text}</pre>
		{/each}
	{/if}
	{#each diffs as diff, index (index)}
		<Diff {...diff} {view} />
	{/each}
</div>

<style>
.tool {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-1);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing-2);
	color: var(--color-text-muted);
}

.row :global(svg) {
	flex: none;
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}

.status {
	flex: none;
	margin-left: auto;
	font-family: var(--font-mono);
	font-size: var(--text-xs);
}

.in_progress {
	color: var(--color-state-running);
}

.failed {
	color: var(--color-state-error);
}

button {
	display: flex;
	flex: none;
	outline-color: var(--color-focus);
}

button:hover {
	color: var(--color-text);
}

pre {
	max-height: calc(var(--spacing-row) * 10);
	overflow: auto;
	padding: var(--spacing-2) var(--spacing-2_5);
	border-radius: var(--radius-control);
	background: var(--color-chrome);
	color: var(--color-text-soft);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	line-height: var(--leading-tight);
}
</style>
