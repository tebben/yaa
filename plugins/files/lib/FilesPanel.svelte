<script lang="ts">
import Eye from "@lucide/svelte/icons/eye";
import EyeOff from "@lucide/svelte/icons/eye-off";
import FilePlus from "@lucide/svelte/icons/file-plus";
import Pencil from "@lucide/svelte/icons/pencil";
import Search from "@lucide/svelte/icons/search";
import Trash from "@lucide/svelte/icons/trash-2";
import type { PanelProps } from "@yaa/plugin-api/ui";
import { IconButton, TextField } from "@yaa/ui";
import { untrack } from "svelte";
import FileEditForm from "./FileEditForm.svelte";
import FileRow from "./FileRow.svelte";
import { createFilesPanel } from "./files-panel.svelte.ts";

let { panel }: PanelProps = $props();
// A panel keeps its context for as long as it is open.
const view = createFilesPanel(untrack(() => panel));
const { files, edits } = view;
</script>

<div class="files">
	<div class="toolbar">
		<form
			class="filter"
			onsubmit={(event) => {
				event.preventDefault();
				view.focusFirst();
			}}
		>
			<TextField
				icon={Search}
				placeholder="Filter"
				aria-label="Filter files"
				bind:value={() => view.query, (text) => (view.query = text)}
				{@attach view.field}
			/>
		</form>
		<IconButton icon={FilePlus} label="New file" onclick={edits.create} />
		<IconButton icon={Pencil} label="Rename" onclick={edits.rename} />
		<IconButton icon={Trash} label="Delete" onclick={edits.remove} />
		<IconButton
			icon={files.showIgnored ? Eye : EyeOff}
			label="Show ignored files"
			pressed={files.showIgnored}
			onclick={files.toggleIgnored}
		/>
	</div>
	{#if edits.edit}
		<FileEditForm {edits} edit={edits.edit} />
	{/if}
	{#if files.problem}
		<p class="note problem">{files.problem}</p>
	{/if}
	<ul class="rows" aria-label="Files" {@attach view.list}>
		{#each view.rows as row (row.path)}
			<li>
				<FileRow
					{row}
					current={row.path === view.current}
					onfocus={() => view.focused(row.path)}
					onclick={() => view.activate(row.path)}
				/>
			</li>
		{/each}
	</ul>
	{#if files.tree === undefined}
		{#if !files.problem}
			<p class="note">Listing files…</p>
		{/if}
	{:else if view.rows.length === 0}
		<p class="note">{view.filtering ? "Nothing matches." : "No files."}</p>
	{:else if view.truncated}
		<p class="note">More files match. Type more to narrow them.</p>
	{/if}
</div>

<style>
.files {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing-0_5);
	padding: var(--spacing-2) var(--spacing-1_5) var(--spacing-2) var(--spacing-3);
}

.filter {
	flex: 1;
	min-width: 0;
	margin-right: var(--spacing-1);
}

.rows {
	flex: 0 1 auto;
	min-height: 0;
	overflow: auto;
}

.note {
	padding: var(--spacing-1) var(--spacing-3);
	color: var(--color-text-muted);
}

.problem {
	color: var(--color-state-error);
}
</style>
