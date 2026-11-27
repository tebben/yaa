<script lang="ts">
import { Button } from "@yaa/ui";
import type { editor } from "monaco-editor/editor";
import MarkdownOutline from "./MarkdownOutline.svelte";
import {
	attachMarkdown,
	createMarkdownSource,
} from "./markdown-preview.svelte.ts";

type ImageData = { data: string; mime: string };
let {
	model,
	path,
	toc,
	read,
	fetch,
	open,
}: {
	model: editor.ITextModel;
	path: string;
	toc: boolean;
	read: (path: string) => Promise<ImageData>;
	fetch: (url: string) => Promise<ImageData>;
	open: (path: string) => void;
} = $props();

let remote = $state(false);
let content = $state<HTMLElement>();
const source = createMarkdownSource(() => model);
const document = $derived(source.document);
const remoteImages = $derived(
	document.images.some((image) => /^https:\/\//i.test(image.href)),
);

const goTo = (id: string) =>
	content?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView();
</script>

<div class="preview">
	{#if remoteImages && !remote}
		<div class="permission">
			<p>
				Remote images can reveal your IP address to their hosts and any redirect
				hosts.
			</p>
			<Button onclick={() => (remote = true)}>Load remote images</Button>
		</div>
	{/if}
	<div class="body">
		<div class="scroll">
			{#key document}
				<div
					class="markdown"
					{@attach (element) => {
						content = element;
						return () => {
							content = undefined;
						};
					}}
					{@attach attachMarkdown({
						path,
						document,
						remote,
						read,
						fetch,
						open,
					})}
				></div>
			{/key}
		</div>
		{#if toc}
			<MarkdownOutline headings={document.headings} onselect={goTo} />
		{/if}
	</div>
</div>

<style>
.preview,
.body {
	display: flex;
	flex: 1;
	min-height: 0;
}
.preview {
	flex-direction: column;
}
.body {
	min-width: 0;
}
.scroll {
	flex: 1;
	min-width: 0;
	overflow: auto;
}
.permission {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-2);
	padding: var(--spacing-2);
	border-bottom: 1px solid var(--color-border);
}
.permission p {
	color: var(--color-text-soft);
}
.markdown {
	display: flow-root;
	padding: var(--spacing-4);
	overflow-wrap: anywhere;
}
.markdown :global(:is(h1, h2, h3, h4, h5, h6)) {
	margin: var(--spacing-3) 0;
	font-weight: var(--font-weight-semibold);
}
.markdown :global(:is(h1, h2)) {
	font-size: var(--text-title);
}
.markdown :global(:is(p, pre, blockquote, ul, ol, table)) {
	margin: var(--spacing-2) 0;
}
.markdown :global(:is(ul, ol)) {
	padding-left: var(--spacing-4_5);
}
.markdown :global(ul) {
	list-style: disc;
}
.markdown :global(ol) {
	list-style: decimal;
}
.markdown :global(a) {
	color: var(--color-accent);
	text-decoration: underline;
}
.markdown :global(img) {
	max-width: 100%;
}
.markdown :global(pre) {
	overflow: auto;
	padding: var(--spacing-2);
	background: var(--color-raised);
	font-family: var(--font-mono);
}
.markdown :global(code) {
	font-family: var(--font-mono);
}
.markdown :global(blockquote) {
	padding-left: var(--spacing-3);
	border-left: var(--spacing-1) solid var(--color-border-strong);
	color: var(--color-text-soft);
}
.markdown :global(:is(th, td)) {
	padding: var(--spacing-1) var(--spacing-2);
	border: 1px solid var(--color-border);
}
.markdown :global(table) {
	border-collapse: collapse;
}
</style>
