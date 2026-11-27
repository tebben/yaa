<script lang="ts">
import Check from "@lucide/svelte/icons/check";
import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
import { Select } from "bits-ui";
import Icon from "./Icon.svelte";
import type { Option } from "./option.ts";

// A choice from a list that opens under it.
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

const selected = $derived(options.find((option) => option.value === value));
</script>

<Select.Root
	type="single"
	{value}
	{disabled}
	items={[...options]}
	onValueChange={onchange}
>
	<Select.Trigger
		aria-label={label}
		class="inline-flex h-control w-field items-center justify-between gap-2 rounded-control border border-border-strong bg-raised px-2 text-text outline-focus hover:bg-hover focus-visible:outline-1 disabled:opacity-50"
	>
		<span class="truncate">{selected?.label ?? value}</span>
		<Icon icon={ChevronsUpDown} class="size-3.5 text-text-muted" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			sideOffset={4}
			class="z-50 w-(--bits-select-anchor-width) rounded-control border border-border-strong bg-overlay p-1 shadow-overlay"
		>
			<Select.Viewport>
				{#each options as option (option.value)}
					<Select.Item
						value={option.value}
						label={option.label}
						class="flex h-row cursor-pointer items-center justify-between gap-2 rounded-chip px-2 text-text-soft outline-none data-highlighted:bg-selection data-highlighted:text-text"
					>
						{#snippet children({ selected })}
							<span class="truncate">{option.label}</span>
							{#if selected}
								<Icon icon={Check} class="size-3.5 text-accent" />
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
