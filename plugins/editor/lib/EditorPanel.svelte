<script lang="ts">
import type { PanelProps } from "@yaa/plugin-api/ui";
import { untrack } from "svelte";
import EditorNotice from "./EditorNotice.svelte";
import EditorTabs from "./EditorTabs.svelte";
import { createEditorPanel } from "./editor-panel.svelte.ts";

let { panel }: PanelProps = $props();
// A panel keeps its context for as long as it is open.
const context = untrack(() => panel);
const editor = createEditorPanel(context);

const unreadable = {
	binary: "This file is not UTF-8 text.",
	tooLarge: "This file is too large to open.",
	missing: "This file no longer exists.",
} as const;
const reason = $derived(editor.active?.document?.unreadable);
const hasText = $derived(editor.active?.document?.model !== undefined);
</script>

<div class="editor">
	<!-- The header moves into the panel's, so it needs a parent of its own. -->
	<div>
		<div class="header" {@attach context.header}>
			<EditorTabs {editor} />
		</div>
	</div>
	{#if editor.problem}
		<p class="note problem">{editor.problem}</p>
	{/if}
	<EditorNotice {editor} />
	<div
		class={["code", { hidden: !hasText }]}
		{@attach editor.view.attach}
	></div>
	{#if editor.active === undefined}
		<p class="note">
			No file is open. Pick one in the files panel, or use Go to file.
		</p>
	{:else if reason}
		<p class="note">{unreadable[reason]}</p>
	{/if}
</div>

<style>
.editor {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.header {
	height: 100%;
}

.code {
	flex: 1;
	min-height: 0;
}

.hidden {
	display: none;
}

.note {
	padding: var(--spacing-2) var(--spacing-3);
	color: var(--color-text-muted);
}

.problem {
	color: var(--color-state-error);
}
</style>
