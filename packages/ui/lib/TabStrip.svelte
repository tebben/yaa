<script lang="ts">
import type { Snippet } from "svelte";
import TabClose from "./TabClose.svelte";
import type { Tab } from "./tab.ts";

// Tabs for a panel's header, such as open files. A middle click or a tab's
// close button closes it; the active tab is scrolled into view. `icon` draws
// each tab's icon, `empty` takes the tabs' place when there are none, and
// `after` follows them.
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
	icon: Snippet<[Tab]>;
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
					"tab yaa-tab",
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
					{@render icon(tab)}
					<span class="name">{tab.name}</span>
					{#if tab.detail}
						<span class="detail">{tab.detail}</span>
					{/if}
				</button>
				<TabClose
					label={tab.dot === undefined
						? `Close ${tab.name}`
						: `Close ${tab.name}, ${tab.dot}`}
					dotted={tab.dot !== undefined}
					concealed={!tab.active}
					onclick={() => onclose(tab.id)}
				/>
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

.pick :global(svg) {
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

.none {
	align-self: center;
	padding-left: var(--spacing-3);
	font-weight: var(--font-weight-medium);
}
</style>
