<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLInputAttributes } from "svelte/elements";
import Icon from "./Icon.svelte";
import type { IconSource } from "./icon-source.ts";

// A one-line text input, with an icon before the text and, as `children`,
// whatever follows it. Other attributes, attachments included, go to the
// input.
let {
	icon,
	children,
	value = $bindable(""),
	...input
}: Omit<HTMLInputAttributes, "class" | "children"> & {
	icon?: IconSource;
	children?: Snippet;
} = $props();
</script>

<div
	class="flex h-control items-center gap-2 rounded-control border border-border-strong bg-raised px-2 focus-within:outline-1 focus-within:outline-focus"
>
	{#if icon}
		<Icon {icon} class="size-3.5 shrink-0 text-text-muted" />
	{/if}
	<input
		class="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted"
		spellcheck="false"
		{...input}
		bind:value
	>
	{@render children?.()}
</div>
