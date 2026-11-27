<script lang="ts">
// A colour as #rrggbb: picked from the swatch, which opens the system's
// picker, or typed. `oninput` follows the picker as it moves; `onchange`
// gets the colour it settles on, and a typed colour on Enter or when focus
// leaves.
let {
	value,
	label,
	disabled = false,
	oninput,
	onchange,
}: {
	value: string;
	label: string;
	disabled?: boolean;
	oninput?: (value: string) => void;
	onchange: (value: string) => void;
} = $props();

const isHex = (text: string) => /^#[0-9a-fA-F]{6}$/.test(text);
</script>

<div class="inline-flex items-center gap-1.5">
	<input
		type="color"
		class="size-control cursor-pointer rounded-control border border-border-strong bg-raised p-0.5 outline-focus focus-visible:outline-1 disabled:cursor-default disabled:opacity-50"
		aria-label={label}
		{disabled}
		{value}
		oninput={(event) => oninput?.(event.currentTarget.value)}
		onchange={(event) => onchange(event.currentTarget.value)}
	>
	<input
		type="text"
		class="h-control w-short-field rounded-control border border-border-strong bg-raised px-1.5 font-mono text-sm text-text outline-none focus:outline-1 focus:outline-focus disabled:opacity-50"
		aria-label="{label} as hex"
		spellcheck="false"
		maxlength="7"
		{disabled}
		{value}
		onchange={(event) => {
			const typed = event.currentTarget.value.trim();
			const hex = typed.startsWith("#") ? typed : `#${typed}`;
			if (isHex(hex)) onchange(hex.toLowerCase());
			else event.currentTarget.value = value;
		}}
	>
</div>

<style>
/* The swatch fills the button, without the browser's own frame. */
input[type="color"]::-webkit-color-swatch-wrapper {
	padding: 0;
}
input[type="color"]::-webkit-color-swatch {
	border: none;
	border-radius: var(--radius-chip);
}
</style>
