<script lang="ts">
import { Button } from "bits-ui";
import type { Snippet } from "svelte";

// A submit button needs no onclick: its form handles the submit.
let {
	children,
	onclick,
	type = "button",
	disabled = false,
}: {
	children: Snippet;
	onclick?: () => void;
	type?: "button" | "submit";
	disabled?: boolean;
} = $props();
</script>

<Button.Root
	class="inline-flex h-control items-center gap-1.5 rounded-control border border-border-input bg-raised px-2.5 text-text outline-focus hover:bg-selection focus-visible:outline-1 disabled:text-text-muted disabled:hover:bg-raised"
	{type}
	{onclick}
	{disabled}
>
	{@render children()}
</Button.Root>
