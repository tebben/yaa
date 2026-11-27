<script lang="ts">
import Minus from "@lucide/svelte/icons/minus";
import Plus from "@lucide/svelte/icons/plus";
import Icon from "./Icon.svelte";
import { stepNumber } from "./step-number.ts";

// A number between `min` and `max`: typed, or stepped with the buttons or
// the arrow keys. A typed value applies on Enter or when focus leaves.
let {
	value,
	min,
	max,
	step,
	unit,
	label,
	disabled = false,
	onchange,
}: {
	value: number;
	min: number;
	max: number;
	step: number;
	unit?: string | undefined;
	label: string;
	disabled?: boolean;
	onchange: (value: number) => void;
} = $props();

const change = (next: number) => {
	if (next !== value) onchange(next);
};
const by = (steps: number) =>
	change(stepNumber(value, steps, { min, max, step }));
const button =
	"inline-flex size-control items-center justify-center rounded-control border border-border-strong bg-raised text-text-soft outline-focus hover:bg-hover hover:text-text focus-visible:outline-1 disabled:opacity-50";
</script>

<div class="inline-flex items-center gap-1.5">
	<button
		type="button"
		class={button}
		aria-label="Less"
		disabled={disabled || value <= min}
		onclick={() => by(-1)}
	>
		<Icon icon={Minus} class="size-3.5" />
	</button>
	<!-- The unit sits inside the box, so fields with and without one line up. -->
	<label
		class="flex h-control w-short-field items-center gap-1 rounded-control border border-border-strong bg-raised px-1.5 focus-within:outline-1 focus-within:outline-focus has-disabled:opacity-50"
	>
		<input
			class="min-w-0 flex-1 bg-transparent text-right text-text tabular-nums outline-none"
			type="text"
			inputmode="decimal"
			aria-label={label}
			{disabled}
			value={String(value)}
			onchange={(event) => {
				const typed = Number.parseFloat(event.currentTarget.value);
				const next = Number.isNaN(typed)
					? value
					: stepNumber(typed, 0, { min, max, step });
				// Shows the clamped value, or the old one for text that is no number.
				event.currentTarget.value = String(next);
				change(next);
			}}
			onkeydown={(event) => {
				if (event.key === "ArrowUp" || event.key === "ArrowDown") {
					event.preventDefault();
					by(event.key === "ArrowUp" ? 1 : -1);
				}
			}}
		>
		<span class="w-4 shrink-0 text-sm text-text-muted">{unit ?? ""}</span>
	</label>
	<button
		type="button"
		class={button}
		aria-label="More"
		disabled={disabled || value >= max}
		onclick={() => by(1)}
	>
		<Icon icon={Plus} class="size-3.5" />
	</button>
</div>
