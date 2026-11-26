<script lang="ts">
import type { LucideIcon } from "@lucide/svelte";
import { Tooltip } from "bits-ui";

// The label names the action for the tooltip and screen readers; the
// shortcut, when the action has one, is shown beside it. A toggle passes
// `pressed`. In a column of buttons, such as the rail, `tooltipSide` puts
// the tooltip beside the column so it covers none of the others.
let {
	icon: Icon,
	label,
	shortcut,
	pressed,
	tooltipSide = "top",
	onclick,
}: {
	icon: LucideIcon;
	label: string;
	shortcut?: string | undefined;
	pressed?: boolean;
	tooltipSide?: "top" | "right" | "bottom" | "left";
	onclick: () => void;
} = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		class="inline-flex size-control items-center justify-center rounded-control text-text-muted outline-focus hover:bg-selection hover:text-text focus-visible:bg-selection focus-visible:text-text focus-visible:outline-1 aria-pressed:bg-selection aria-pressed:text-text"
		aria-label={label}
		aria-pressed={pressed}
		{onclick}
	>
		<Icon class="size-3.5" aria-hidden="true" />
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			side={tooltipSide}
			class="data-[side=bottom]:my-1 data-[side=left]:mx-1 data-[side=right]:mx-1 data-[side=top]:my-1 flex items-center gap-2 rounded-control border border-border bg-raised px-2 py-1 text-sm text-text"
		>
			{label}
			{#if shortcut}
				<kbd class="font-mono text-text-muted">{shortcut}</kbd>
			{/if}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
