<script lang="ts">
import { X } from "@lucide/svelte";
import Icon from "./Icon.svelte";

// The close button of a tab in a strip, the editor's file tabs and the
// grid's panel tabs alike. A dotted tab, such as one with unsaved text, shows
// a dot in its place, which turns into the cross under the pointer or with
// focus. A strip conceals
// the cross of a clean tab that is not the shown one until its tab, marked
// `yaa-tab`, is hovered.
let {
	label,
	dotted = false,
	concealed = false,
	onclick,
}: {
	label: string;
	dotted?: boolean;
	concealed?: boolean;
	onclick: () => void;
} = $props();
</script>

<button
	type="button"
	class={["yaa-tab-close", { dotted, concealed }]}
	aria-label={label}
	{onclick}
>
	<span class="dot"></span>
	<span class="cross"><Icon icon={X} /></span>
</button>

<style>
.yaa-tab-close {
	display: grid;
	flex: none;
	place-items: center;
	width: var(--spacing-4_5);
	height: var(--spacing-4_5);
	border-radius: var(--radius-chip);
	color: inherit;
	outline: none;
}

.yaa-tab-close:hover,
.yaa-tab-close:focus-visible {
	background: var(--color-hover);
	color: var(--color-text);
}

.yaa-tab-close :global(svg) {
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}

/* The dot and the cross share a place. */
.dot,
.cross {
	grid-area: 1 / 1;
	visibility: hidden;
}

.dot {
	width: var(--spacing-2);
	height: var(--spacing-2);
	border-radius: 50%;
	background: var(--color-text-soft);
}

.cross {
	display: flex;
}

.dotted:not(:hover, :focus-visible) .dot,
.dotted:is(:hover, :focus-visible) .cross,
.yaa-tab-close:not(.dotted, .concealed) .cross,
.yaa-tab-close:not(.dotted):focus-visible .cross,
:global(.yaa-tab:hover) .yaa-tab-close:not(.dotted) .cross {
	visibility: visible;
}
</style>
