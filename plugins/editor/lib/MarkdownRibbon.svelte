<script lang="ts">
import Eye from "@lucide/svelte/icons/eye";
import ListTree from "@lucide/svelte/icons/list-tree";
import Pencil from "@lucide/svelte/icons/pencil";
import { keyParts } from "@yaa/commands/key-chord";
import { IconButton, Ribbon } from "@yaa/ui";
import type { EditorPanelController } from "./editor-panel.svelte.ts";

let {
	editor,
	keysFor,
}: {
	editor: EditorPanelController;
	keysFor: (command: string) => readonly string[];
} = $props();

const shortcut = (command: string) => {
	const [key] = keysFor(command);
	return key === undefined ? undefined : keyParts(key);
};
</script>

<Ribbon label="Markdown">
	<IconButton
		icon={Pencil}
		label="Edit Markdown"
		shortcut={shortcut("editor.toggleMarkdown")}
		pressed={!editor.readMode}
		onclick={() => {
			if (editor.readMode) editor.toggleMarkdown();
		}}
	/>
	<IconButton
		icon={Eye}
		label="Read Markdown"
		shortcut={shortcut("editor.toggleMarkdown")}
		pressed={editor.readMode}
		onclick={() => {
			if (!editor.readMode) editor.toggleMarkdown();
		}}
	/>
	{#if editor.readMode}
		<IconButton
			icon={ListTree}
			label="Show table of contents"
			shortcut={shortcut("editor.toggleMarkdownToc")}
			pressed={editor.toc}
			onclick={editor.toggleToc}
		/>
	{/if}
</Ribbon>
