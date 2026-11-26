<script lang="ts">
import { Button, TextField } from "@yaa/ui";
import type { Edit, FileEdits } from "./file-edits.svelte.ts";

// What the panel asks before it changes a file. Enter confirms, Escape
// cancels (the panel's cancel command).
let { edits, edit }: { edits: FileEdits; edit: Edit } = $props();

const focus = (element: HTMLElement) => {
	element.focus({ focusVisible: true });
};
// A deletion has nothing to type: Enter on its button says yes.
const focusFirstButton = (element: HTMLElement) => {
	if (edit.kind !== "delete") return;
	element.querySelector("button")?.focus({ focusVisible: true });
};
</script>

<form
	class="edit"
	onsubmit={(event) => {
		event.preventDefault();
		edits.confirm();
	}}
>
	{#if edit.kind === "delete"}
		<p>
			{edit.folder
				? `Delete the folder ${edit.path} and everything in it?`
				: `Delete ${edit.path}?`}
		</p>
	{:else}
		<!-- Made anew for each edit, so each one takes focus. -->
		{#key edit}
			<TextField
				aria-label={edit.kind === "create" ? "New file path" : "New path"}
				placeholder="Path in the worktree"
				bind:value={() => edits.path, (text) => (edits.path = text)}
				{@attach focus}
			/>
		{/key}
	{/if}
	{#if edits.refused}
		<p class="refused">{edits.refused}</p>
	{/if}
	<div class="actions" {@attach focusFirstButton}>
		<Button type="submit">
			{#if edit.kind === "delete"}
				Delete
			{:else}
				{edit.kind === "create" ? "Create" : "Rename"}
			{/if}
		</Button>
		<Button onclick={() => edits.cancel()}>Cancel</Button>
	</div>
</form>

<style>
.edit {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2);
	padding: 0 var(--spacing-3) var(--spacing-2);
	overflow-wrap: anywhere;
}

.actions {
	display: flex;
	gap: var(--spacing-2);
}

.refused {
	color: var(--color-state-error);
}
</style>
