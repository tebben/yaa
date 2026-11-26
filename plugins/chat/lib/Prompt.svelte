<script lang="ts">
import AttachmentChip from "./AttachmentChip.svelte";
import type { TranscriptItem } from "./transcript.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// What the user sent.
let {
	text,
	attachments,
	view,
}: {
	text: string;
	attachments: Extract<TranscriptItem, { kind: "prompt" }>["attachments"];
	view: TranscriptView;
} = $props();
</script>

<div class="prompt">
	{#if attachments.length > 0}
		<div class="attachments">
			{#each attachments as attachment, index (index)}
				<AttachmentChip
					{attachment}
					onopen={attachment.type === "file" &&
					attachment.path.startsWith(`${view.root}/`)
						? () => view.openFile(attachment.path)
						: undefined}
				/>
			{/each}
		</div>
	{/if}
	{#if text !== ""}
		<p>{text}</p>
	{/if}
</div>

<style>
.prompt {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-1_5);
	padding: var(--spacing-2) var(--spacing-2_5);
	border-radius: var(--radius-control);
	background: var(--color-raised);
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-1);
}

p {
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}
</style>
