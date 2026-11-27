<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import Folder from "@lucide/svelte/icons/folder";
import { FileIcon, Icon } from "@yaa/ui";
import type { Row } from "./file-tree.ts";

let {
	row,
	current,
	onfocus,
	onclick,
	ondblclick,
}: {
	row: Row;
	current: boolean;
	onfocus: () => void;
	onclick: (event: MouseEvent) => void;
	ondblclick: () => void;
} = $props();

const letters = {
	modified: "M",
	added: "A",
	renamed: "R",
	untracked: "U",
	conflicted: "!",
} as const;
</script>

<button
	type="button"
	class={["row", row.status, { current, ignored: row.ignored }]}
	style:--depth={row.depth}
	aria-expanded={row.folder ? row.expanded : undefined}
	title={row.path}
	{onfocus}
	{onclick}
	{ondblclick}
>
	<span class="icon">
		{#if row.folder}
			<Icon icon={row.expanded ? ChevronDown : ChevronRight} />
		{/if}
	</span>
	<span class="icon">
		{#if row.folder}
			<Icon icon={Folder} />
		{:else}
			<FileIcon path={row.path} />
		{/if}
	</span>
	<span class="name">{row.label}</span>
	{#if row.status}
		<span class="mark" title={row.status}>{letters[row.status]}</span>
	{:else if row.folder && row.changed}
		<span class="mark dot" title="Has changes"></span>
	{/if}
</button>

<style>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing-1_5);
	width: 100%;
	height: var(--spacing-row);
	padding-right: var(--spacing-3);
	padding-left: calc(var(--spacing-3) + var(--depth) * var(--spacing-3));
	color: var(--color-text-soft);
	font-size: var(--text-sm);
	text-align: left;
	outline: none;
}

.row:hover,
.row:focus-visible {
	background: var(--color-hover);
	color: var(--color-text);
}

.current {
	background: var(--color-selection);
}

.icon {
	display: flex;
	flex: none;
	width: var(--spacing-3_5);
	color: var(--color-text-muted);
}

.icon :global(svg) {
	width: 100%;
	height: var(--spacing-3_5);
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mark {
	flex: none;
	font-family: var(--font-mono);
	font-size: var(--text-xs);
}

.dot {
	width: var(--spacing-1_5);
	height: var(--spacing-1_5);
	border-radius: 50%;
	background: var(--color-state-attention);
}

.ignored,
.ignored:hover {
	color: var(--color-text-muted);
}

.modified .mark {
	color: var(--color-state-attention);
}

.added .mark,
.untracked .mark {
	color: var(--color-state-done);
}

.renamed .mark {
	color: var(--color-state-running);
}

.conflicted .mark {
	color: var(--color-state-error);
}
</style>
