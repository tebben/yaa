<script lang="ts">
import { ToggleGroup } from "bits-ui";
import type { Option } from "./option.ts";

// A choice of a few options side by side, one of them always chosen.
let {
	value,
	options,
	label,
	disabled = false,
	onchange,
}: {
	value: string;
	options: readonly Option[];
	label: string;
	disabled?: boolean;
	onchange: (value: string) => void;
} = $props();
</script>

<ToggleGroup.Root
	type="single"
	{value}
	{disabled}
	aria-label={label}
	onValueChange={(next) => {
		// Clicking the chosen option would clear the choice; it stays.
		if (next !== "") onchange(next);
	}}
	class="inline-flex h-control items-center gap-0.5 rounded-control border border-border-strong bg-raised p-0.5"
>
	{#each options as option (option.value)}
		<ToggleGroup.Item
			value={option.value}
			class="h-full rounded-chip px-2 text-sm text-text-soft outline-focus hover:text-text focus-visible:outline-1 disabled:opacity-50 data-[state=on]:bg-selection data-[state=on]:text-text"
			>{option.label}</ToggleGroup.Item
		>
	{/each}
</ToggleGroup.Root>
