<script lang="ts">
import type { LucideIcon } from "@lucide/svelte";
import { Tooltip } from "bits-ui";

// The label names the action for the tooltip and screen readers; the
// shortcut, when the action has one, is shown beside it.
let {
	icon: Icon,
	label,
	shortcut,
	onclick,
}: {
	icon: LucideIcon;
	label: string;
	shortcut?: string;
	onclick: () => void;
} = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		class="inline-flex size-control items-center justify-center rounded-control text-text-muted outline-focus hover:bg-selection hover:text-text focus-visible:outline-1"
		aria-label={label}
		{onclick}
	>
		<Icon class="size-3.5" aria-hidden="true" />
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			class="my-1 flex items-center gap-2 rounded-control border border-border bg-raised px-2 py-1 text-sm text-text"
		>
			{label}
			{#if shortcut}
				<kbd class="font-mono text-text-muted">{shortcut}</kbd>
			{/if}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
