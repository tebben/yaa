<script lang="ts">
import { Button } from "bits-ui";
import type { Snippet } from "svelte";

let {
	children,
	onclick,
	disabled = false,
}: { children: Snippet; onclick: () => void; disabled?: boolean } = $props();
</script>

<Button.Root
	class="inline-flex h-control items-center gap-1.5 rounded-control border border-border-input bg-raised px-2.5 text-text outline-focus hover:bg-selection focus-visible:outline-1 disabled:text-text-muted disabled:hover:bg-raised"
	{onclick}
	{disabled}
>
	{@render children()}
</Button.Root>
