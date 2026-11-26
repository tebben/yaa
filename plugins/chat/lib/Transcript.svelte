<script lang="ts">
import { VList, type VListHandle } from "virtua/svelte";
import Entry from "./Entry.svelte";
import { followEnd } from "./follow-end.svelte.ts";
import type { Transcript } from "./transcript.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// The virtualized transcript, which stays at its end while a turn streams
// unless it was scrolled up.
let { transcript, view }: { transcript: Transcript; view: TranscriptView } =
	$props();

let list = $state<VListHandle>();
const follow = followEnd(
	() => list,
	() => transcript.items,
);
$effect(() => view.scrolls(follow.page));
</script>

<div class="transcript">
	{#if transcript.items.length === 0}
		<p class="empty">Message the agent. Type / for commands.</p>
	{:else}
		<VList
			bind:this={list}
			data={transcript.items}
			getKey={(item) => item.key}
			style="height: 100%"
			onscroll={follow.scrolled}
			onresize={follow.toEnd}
		>
			{#snippet children(item, index)}
				<div class="entry">
					<Entry
						{item}
						{view}
						streaming={transcript.running &&
							index === transcript.items.length - 1}
					/>
				</div>
			{/snippet}
		</VList>
	{/if}
</div>

<style>
.transcript {
	flex: 1;
	min-height: 0;
}

.empty {
	padding: var(--spacing-3);
	color: var(--color-text-muted);
}

.entry {
	padding: var(--spacing-1) var(--spacing-3);
	user-select: text;
}
</style>
