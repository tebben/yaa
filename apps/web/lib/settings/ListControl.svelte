<script lang="ts">
import Plus from "@lucide/svelte/icons/plus";
import X from "@lucide/svelte/icons/x";
import { IconButton, TextField } from "@yaa/ui";

// A list of short texts in a grid of fields: each edited in place or
// removed, and a new one typed in the last field, which adds it on Enter or
// when focus leaves.
let {
	items,
	placeholder,
	mono,
	label,
	disabled,
	onchange,
}: {
	items: readonly string[];
	placeholder: string | undefined;
	mono: boolean;
	label: string;
	disabled: boolean;
	onchange: (items: string[]) => void;
} = $props();

const replace = (index: number, text: string) =>
	onchange(
		text.trim() === ""
			? items.filter((_, at) => at !== index)
			: items.map((item, at) => (at === index ? text.trim() : item)),
	);
</script>

<ul
	class={["grid grid-cols-3 gap-1.5", mono && "font-mono text-sm"]}
	aria-label={label}
>
	{#each items as item, index (index)}
		<li class="flex items-center gap-0.5">
			<div class="min-w-0 flex-1">
				<TextField
					value={item}
					aria-label="{label} {index + 1}"
					{disabled}
					onchange={(event) => replace(index, event.currentTarget.value)}
				/>
			</div>
			<IconButton
				icon={X}
				label="Remove {item}"
				onclick={() => onchange(items.filter((_, at) => at !== index))}
			/>
		</li>
	{/each}
	<li>
		<TextField
			icon={Plus}
			{placeholder}
			aria-label="Add to {label}"
			{disabled}
			onchange={(event) => {
				const typed = event.currentTarget.value.trim();
				if (typed === "") return;
				event.currentTarget.value = "";
				onchange([...items, typed]);
			}}
		/>
	</li>
</ul>
