<script lang="ts">
import { Tooltip } from "bits-ui";
import type { HTMLButtonAttributes } from "svelte/elements";
import Icon from "./Icon.svelte";
import type { IconSource } from "./icon-source.ts";
import Kbd from "./Kbd.svelte";

// The label names the action for the tooltip and screen readers; the
// shortcut, when the action has one, is shown beside it. A toggle passes
// `pressed`, shown by a bright icon on a quiet tint. `large` draws a larger
// icon in the same button, for the header. `tooltipSide` puts the tooltip
// where it covers nothing it should not, such as below a button in the
// header. Pointer and focus handlers reach the button.
let {
	icon,
	label,
	shortcut,
	pressed,
	size = "default",
	tooltipSide = "top",
	onclick,
	...events
}: {
	icon: IconSource;
	label: string;
	shortcut?: readonly string[] | undefined;
	pressed?: boolean;
	size?: "default" | "large";
	tooltipSide?: "top" | "right" | "bottom" | "left";
	onclick: () => void;
} & Pick<
	HTMLButtonAttributes,
	"onpointerenter" | "onpointerleave" | "onfocus" | "onblur"
> = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		class="inline-flex size-control shrink-0 items-center justify-center rounded-control text-text-muted outline-focus hover:bg-hover hover:text-text focus-visible:bg-hover focus-visible:text-text focus-visible:outline-1 aria-pressed:bg-pressed aria-pressed:text-text aria-pressed:hover:bg-hover"
		aria-label={label}
		aria-pressed={pressed}
		{onclick}
		{...events}
	>
		<Icon {icon} class={size === "large" ? "size-4" : "size-3.5"} />
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			side={tooltipSide}
			class="data-[side=bottom]:my-1 data-[side=left]:mx-1 data-[side=right]:mx-1 data-[side=top]:my-1 flex items-center gap-2 rounded-control border border-border bg-overlay px-2 py-1 text-sm text-text shadow-overlay"
		>
			{label}
			{#if shortcut}
				<Kbd keys={shortcut} />
			{/if}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
