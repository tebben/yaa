<script lang="ts">
import X from "@lucide/svelte/icons/x";
import type { Snippet } from "svelte";
import Icon from "./Icon.svelte";
import type { IconSource } from "./icon-source.ts";
import type { Tab } from "./tab.ts";

// Tabs for a panel's header, such as open files. A middle click or a tab's
// close button closes it; the active tab is scrolled into view. `empty` takes
// the tabs' place when there are none, and `after` follows them.
let {
	tabs,
	label,
	icon,
	empty,
	onselect,
	onclose,
	ondblclick,
	after,
}: {
	tabs: readonly Tab[];
	// Names the list for screen readers.
	label: string;
	icon: IconSource;
	empty: string;
	onselect: (id: string) => void;
	onclose: (id: string) => void;
	ondblclick?: (id: string) => void;
	after?: Snippet;
} = $props();
</script>

<div class="strip">
	<div class="tabs" role="tablist" aria-label={label}>
		{#each tabs as tab (tab.id)}
			<div
				class={[
					"tab",
					{ active: tab.active, italic: tab.italic, struck: tab.struck },
				]}
				{@attach tab.active
					? (node: Element) =>
							node.scrollIntoView({ block: "nearest", inline: "nearest" })
					: undefined}
			>
				<button
					type="button"
					class="pick"
					role="tab"
					aria-selected={tab.active}
					title={tab.title}
					onclick={() => onselect(tab.id)}
					ondblclick={() => ondblclick?.(tab.id)}
					onauxclick={(event) => {
						if (event.button === 1) onclose(tab.id);
					}}
				>
					<Icon {icon} />
					<span class="name">{tab.name}</span>
					{#if tab.detail}
						<span class="detail">{tab.detail}</span>
					{/if}
				</button>
				<button
					type="button"
					class={["close", { dotted: tab.dot !== undefined }]}
					aria-label={tab.dot === undefined
						? `Close ${tab.name}`
						: `Close ${tab.name}, ${tab.dot}`}
					onclick={() => onclose(tab.id)}
				>
					<span class="dot"></span>
					<span class="cross"><Icon icon={X} /></span>
				</button>
			</div>
		{:else}
			<span class="none">{empty}</span>
		{/each}
	</div>
	{#if after}
		<div class="after">{@render after()}</div>
	{/if}
</div>

<style>
.strip {
	display: flex;
	height: 100%;
	min-width: 0;
}

.tabs {
	display: flex;
	min-width: 0;
	overflow-x: auto;
	scrollbar-width: none;
}

.after {
	display: flex;
	flex: none;
	align-items: center;
	padding: 0 var(--spacing-1);
}

.tab {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--spacing-1);
	padding-right: var(--spacing-1_5);
	border-right: 1px solid var(--color-border);
	color: var(--color-text-muted);
}

.tab:hover {
	color: var(--color-text-soft);
}

.active,
.active:hover {
	background: var(--color-surface);
	color: var(--color-text);
}

.pick {
	display: flex;
	align-items: center;
	gap: var(--spacing-2);
	height: 100%;
	padding-left: var(--spacing-3);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	white-space: nowrap;
	outline: none;
}

.pick :global(svg),
.close :global(svg) {
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}

.italic .name {
	font-style: italic;
}

.struck .name {
	text-decoration: line-through;
}

.pick:focus-visible .name {
	outline: 1px solid var(--color-focus);
}

.detail {
	color: var(--color-text-muted);
	font-size: var(--text-xs);
}

.close {
	display: grid;
	place-items: center;
	width: var(--spacing-4_5);
	height: var(--spacing-4_5);
	border-radius: var(--radius-chip);
	outline: none;
}

.close:hover,
.close:focus-visible {
	background: var(--color-hover);
}

/* The dot and the cross share a place: a tab with a dot shows it until the
   button is under the pointer. */
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

.dotted:is(:hover, :focus-visible) .cross,
.dotted:not(:hover, :focus-visible) .dot,
.active .close:not(.dotted) .cross,
.close:not(.dotted):focus-visible .cross,
.tab:hover .close:not(.dotted) .cross {
	visibility: visible;
}

.none {
	align-self: center;
	padding-left: var(--spacing-3);
	font-weight: var(--font-weight-medium);
}
</style>
