<script lang="ts">
import { X } from "@lucide/svelte";
import Icon from "./Icon.svelte";
import TabButton from "./TabButton.svelte";

// The close button of a tab in a strip, the editor's file tabs and the
// grid's panel tabs alike. A dotted tab, such as one with unsaved text, shows
// a dot in its place, which turns into the cross under the pointer or with
// focus. A strip conceals the cross of a clean tab that is not the shown one
// until its tab, marked `yaa-tab`, is hovered.
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

<TabButton {label} class={["yaa-tab-close", { dotted, concealed }]} {onclick}>
	<span class="dot"></span>
	<span class="cross"><Icon icon={X} /></span>
</TabButton>

<style>
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

/* In ascending specificity. */
:global(.yaa-tab-close:not(.dotted, .concealed)) .cross,
:global(.yaa-tab-close:not(.dotted):focus-visible) .cross,
:global(.yaa-tab-close.dotted:is(:hover, :focus-visible)) .cross,
:global(.yaa-tab-close.dotted:not(:hover, :focus-visible)) .dot,
:global(.yaa-tab:hover .yaa-tab-close:not(.dotted)) .cross {
	visibility: visible;
}
</style>
