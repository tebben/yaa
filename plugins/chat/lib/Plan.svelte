<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import Circle from "@lucide/svelte/icons/circle";
import CircleCheck from "@lucide/svelte/icons/circle-check";
import CircleDot from "@lucide/svelte/icons/circle-dot";
import { Icon } from "@yaa/ui";
import type { Transcript } from "./transcript.ts";

// The agent's latest plan, above the transcript.
let { entries }: { entries: Transcript["plan"] } = $props();

let open = $state(true);
const done = $derived(
	entries.filter(({ status }) => status === "completed").length,
);
const marks = {
	pending: Circle,
	in_progress: CircleDot,
	completed: CircleCheck,
} as const;
</script>

<section>
	<button type="button" aria-expanded={open} onclick={() => (open = !open)}>
		<Icon icon={open ? ChevronDown : ChevronRight} />
		Plan {done}/{entries.length}
	</button>
	{#if open}
		<ul>
			{#each entries as entry, index (index)}
				<li class={entry.status} aria-label={entry.status.replace("_", " ")}>
					<Icon icon={marks[entry.status]} />
					<span>{entry.content}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
section {
	flex: none;
	max-height: 30%;
	overflow-y: auto;
	padding: var(--spacing-1_5) var(--spacing-3);
	border-bottom: 1px solid var(--color-border);
	font-size: var(--text-sm);
}

section :global(svg) {
	flex: none;
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}

button,
li {
	display: flex;
	align-items: center;
	gap: var(--spacing-2);
}

button {
	color: var(--color-text-muted);
	outline-color: var(--color-focus);
}

li {
	padding-top: var(--spacing-1);
	color: var(--color-text-soft);
}

.in_progress {
	color: var(--color-text);
}

.completed {
	color: var(--color-text-muted);
}

.completed span {
	text-decoration: line-through;
}
</style>
