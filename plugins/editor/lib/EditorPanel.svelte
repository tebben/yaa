<script lang="ts">
import type { PanelProps } from "@yaa/plugin-api/ui";
import { untrack } from "svelte";
import EditorNotice from "./EditorNotice.svelte";
import EditorTabs from "./EditorTabs.svelte";
import { createEditorPanel } from "./editor-panel.svelte.ts";
import MarkdownPreview from "./MarkdownPreview.svelte";
import MarkdownRibbon from "./MarkdownRibbon.svelte";

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
		{#if editor.markdown}
			<MarkdownRibbon {editor} keysFor={context.commands.keysFor} />
		{/if}
	</div>
	{#if editor.problem}
		<p class="note problem">{editor.problem}</p>
	{/if}
	<EditorNotice {editor} />
	<div
		class={["code", { hidden: !hasText || editor.readMode }]}
		{@attach editor.view.attach}
	></div>
	{#if editor.readMode && editor.active?.document?.model}
		{#key editor.active.path}
			<div
				class="preview"
				tabindex="-1"
				{@attach (element) => {
					editor.setPreview(element);
					return () => editor.setPreview(undefined);
				}}
			>
				<MarkdownPreview
					model={editor.active.document.model}
					path={editor.active.path}
					toc={editor.toc}
					read={editor.readImage}
					fetch={editor.fetchImage}
					open={editor.openMarkdownFile}
				/>
			</div>
		{/key}
	{/if}
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
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.preview {
	display: flex;
	flex: 1;
	min-height: 0;
	outline: none;
}

.code :global(.text) {
	flex: 1;
	min-height: 0;
}

/* Monaco puts the cursor line's number at the gutter's left edge; it lines
   up with the relative numbers instead, set apart by its brighter colour. */
.code :global(.line-numbers .relative-current-line-number) {
	text-align: right;
}

.code :global(.vim) {
	padding: 0 var(--spacing-3);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	color: var(--color-text-muted);
}

.code :global(.vim input) {
	border: none;
	outline: none;
	background: transparent;
	color: var(--color-text);
	font: inherit;
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
