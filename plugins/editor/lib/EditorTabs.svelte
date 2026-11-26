<script lang="ts">
import File from "@lucide/svelte/icons/file";
import { Icon, TabClose } from "@yaa/ui";
import type { EditorPanelController } from "./editor-panel.svelte.ts";

let { editor }: { editor: EditorPanelController } = $props();
</script>

<div class="tabs" role="tablist" aria-label="Open files">
	{#each editor.tabs as tab (tab.path)}
		<div
			class={[
				"tab yaa-tab",
				{ active: tab.active, preview: tab.preview, deleted: tab.deleted },
			]}
			{@attach tab.active
				? (node: Element) =>
						node.scrollIntoView({ block: "nearest", inline: "nearest" })
				: undefined}
		>
			<button
				type="button"
				class="file"
				role="tab"
				aria-selected={tab.active}
				title={tab.path}
				onclick={() => editor.select(tab.path)}
				ondblclick={() => editor.keep(tab.path)}
				onauxclick={(event) => {
					if (event.button === 1) editor.close(tab.path);
				}}
			>
				<Icon icon={File} />
				<span class="name">{tab.name}</span>
				{#if tab.folder}
					<span class="folder">{tab.folder}</span>
				{/if}
			</button>
			<TabClose
				label={tab.dirty ? `Close ${tab.name}, unsaved` : `Close ${tab.name}`}
				dirty={tab.dirty}
				concealed={!tab.active}
				onclick={() => editor.close(tab.path)}
			/>
		</div>
	{:else}
		<span class="none">Editor</span>
	{/each}
</div>

<style>
.tabs {
	display: flex;
	height: 100%;
	overflow-x: auto;
	scrollbar-width: none;
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

.file {
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

.file :global(svg) {
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}

.preview .name {
	font-style: italic;
}

.deleted .name {
	text-decoration: line-through;
}

.file:focus-visible .name {
	outline: 1px solid var(--color-focus);
}

.folder {
	color: var(--color-text-muted);
	font-size: var(--text-xs);
}

.none {
	align-self: center;
	padding-left: var(--spacing-3);
	font-weight: var(--font-weight-medium);
}
</style>
