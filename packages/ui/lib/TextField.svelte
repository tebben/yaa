<script lang="ts">
import type { HTMLInputAttributes } from "svelte/elements";
import Icon from "./Icon.svelte";
import type { IconSource } from "./icon-source.ts";

// A one-line text input, with an icon before the text. Other attributes,
// attachments included, go to the input.
let {
	icon,
	value = $bindable(""),
	...input
}: Omit<HTMLInputAttributes, "class" | "children"> & {
	icon?: IconSource;
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
</div>
