<script lang="ts">
import type { Snippet } from "svelte";
import type { ClassValue } from "svelte/elements";

// A small button in a tab, such as its close or full-screen button: an icon
// that brightens on a tint under the pointer or with keyboard focus.
let {
	label,
	class: className,
	onclick,
	children,
}: {
	label: string;
	class?: ClassValue;
	onclick: () => void;
	children: Snippet;
} = $props();
</script>

<button
	type="button"
	class={["yaa-tab-button", className]}
	aria-label={label}
	{onclick}
>
	{@render children()}
</button>

<style>
.yaa-tab-button {
	display: grid;
	flex: none;
	place-items: center;
	width: var(--spacing-4_5);
	height: var(--spacing-4_5);
	border-radius: var(--radius-chip);
	color: inherit;
	outline: none;
}

.yaa-tab-button:hover,
.yaa-tab-button:focus-visible {
	background: var(--color-hover);
	color: var(--color-text);
}

.yaa-tab-button :global(svg) {
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}
</style>
