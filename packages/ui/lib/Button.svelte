<script lang="ts">
import { Button } from "bits-ui";
import type { Snippet } from "svelte";

// A submit button needs no onclick: its form handles the submit. A `ghost`
// button is only its text until hovered, for one among many, such as a
// picker in a toolbar. `title` says on hover what the text does not.
let {
	children,
	onclick,
	type = "button",
	disabled = false,
	variant = "default",
	title,
}: {
	children: Snippet;
	onclick?: () => void;
	type?: "button" | "submit";
	disabled?: boolean;
	variant?: "default" | "ghost";
	title?: string;
} = $props();

const looks = {
	default:
		"border-border-strong bg-raised px-2.5 text-text hover:bg-selection disabled:hover:bg-raised",
	ghost:
		"border-transparent px-1.5 text-sm text-text-soft hover:bg-hover hover:text-text disabled:hover:bg-transparent",
} as const;
</script>

<Button.Root
	class={[
		"inline-flex h-control items-center gap-1.5 rounded-control border outline-focus focus-visible:outline-1 disabled:text-text-muted",
		looks[variant],
	]}
	{type}
	{onclick}
	{disabled}
	{title}
>
	{@render children()}
</Button.Root>
