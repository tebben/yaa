<script lang="ts">
import { FileIcon, TabStrip } from "@yaa/ui";
import type { EditorPanelController } from "./editor-panel.svelte.ts";

let { editor }: { editor: EditorPanelController } = $props();
</script>

<TabStrip
	tabs={editor.tabs}
	label="Open files"
	empty="Editor"
	onselect={editor.select}
	ondblclick={editor.keep}
	onclose={editor.close}
>
	{#snippet icon(tab)}
		<FileIcon path={tab.title} />
	{/snippet}
</TabStrip>
