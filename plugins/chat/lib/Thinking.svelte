<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import { Icon } from "@yaa/ui";
import Markdown from "./Markdown.svelte";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// The agent's thinking, closed until asked for.
let {
	text,
	streaming,
	open,
	ontoggle,
	view,
}: {
	text: string;
	streaming: boolean;
	open: boolean;
	ontoggle: () => void;
	view: TranscriptView;
} = $props();
</script>

<div class="thinking">
	<button type="button" aria-expanded={open} onclick={ontoggle}>
		<Icon icon={open ? ChevronDown : ChevronRight} />
		{streaming ? "Thinking…" : "Thought"}
	</button>
	{#if open}
		<div class="text">
			<Markdown {text} {view} {streaming} />
		</div>
	{/if}
</div>

<style>
.thinking {
	color: var(--color-text-muted);
}

button {
	display: flex;
	align-items: center;
	gap: var(--spacing-1_5);
	font-size: var(--text-sm);
	outline-color: var(--color-focus);
}

button:hover {
	color: var(--color-text-soft);
}

button :global(svg) {
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}

.text {
	padding-top: var(--spacing-1);
	padding-left: var(--spacing-4_5);
}
</style>
