<script lang="ts">
import File from "@lucide/svelte/icons/file";
import { TabStrip } from "@yaa/ui";
import type { EditorPanelController } from "./editor-panel.svelte.ts";

let { editor }: { editor: EditorPanelController } = $props();
</script>

<TabStrip
	tabs={editor.tabs}
	label="Open files"
	icon={File}
	empty="Editor"
	onselect={editor.select}
	ondblclick={editor.keep}
	onclose={editor.close}
/>
