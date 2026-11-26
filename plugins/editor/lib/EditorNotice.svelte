<script lang="ts">
import { Button } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";
import type { EditorPanelController } from "./editor-panel.svelte.ts";

// What needs an answer about the file on screen: unsaved text before closing,
// or a disk that moved on.
let { editor }: { editor: EditorPanelController } = $props();

const focus: Attachment<HTMLElement> = (node) => {
	node.querySelector("button")?.focus({ focusVisible: true });
};
</script>

{#if editor.closing !== undefined}
	{@const path = editor.closing}
	<div
		class="notice"
		role="alertdialog"
		aria-label="Unsaved changes"
		{@attach focus}
	>
		<p>Save the changes to {path} before closing it?</p>
		<Button onclick={() => editor.saveAndClose(path)}>Save</Button>
		<Button onclick={() => editor.discardAndClose(path)}>Discard</Button>
		<Button onclick={editor.keepOpen}>Cancel</Button>
	</div>
{:else if editor.active?.document?.disk === "changed"}
	{@const { path } = editor.active}
	<div class="notice" role="alert">
		<p>This file changed on disk while you had unsaved changes.</p>
		<Button onclick={() => editor.overwrite(path)}>Overwrite it</Button>
		<Button onclick={() => editor.revert(path)}>Discard mine</Button>
	</div>
{:else if editor.active?.document?.disk === "deleted"}
	{@const { path } = editor.active}
	<div class="notice" role="alert">
		<p>This file was deleted on disk.</p>
		<Button onclick={() => editor.save(path)}>Save it again</Button>
		<Button onclick={() => editor.close(path)}>Close</Button>
	</div>
{/if}

<style>
.notice {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-1_5);
	padding: var(--spacing-2) var(--spacing-3);
	border-bottom: 1px solid var(--color-border);
}

.notice p {
	/* On a line of its own, above the buttons. */
	flex-basis: 100%;
	color: var(--color-state-attention);
}
</style>
