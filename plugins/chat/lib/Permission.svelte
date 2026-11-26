<script lang="ts">
import { Button } from "@yaa/ui";
import type { TranscriptItem } from "./transcript.ts";

type Item = Extract<TranscriptItem, { kind: "permission" }>;

// A permission the agent asks for: its choices until one is taken.
let {
	title,
	options,
	answer,
	onanswer,
}: {
	title: string;
	options: Item["options"];
	answer: Item["answer"];
	onanswer: (optionId: string) => void;
} = $props();
</script>

<div class={["permission", { waiting: answer === undefined }]}>
	<p>Allow “{title}”?</p>
	{#if answer === undefined}
		<div class="options">
			{#each options as option (option.optionId)}
				<Button onclick={() => onanswer(option.optionId)}>
					{option.name}
				</Button>
			{/each}
		</div>
	{:else}
		<p class="answer">
			{options.find(({ optionId }) => optionId === answer)?.name ?? "Cancelled"}
		</p>
	{/if}
</div>

<style>
.permission {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-1_5);
	padding: var(--spacing-2) var(--spacing-2_5);
	border: 1px solid var(--color-border-strong);
	border-radius: var(--radius-control);
}

.waiting {
	border-color: var(--color-state-attention);
}

.options {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-1_5);
}

.answer {
	color: var(--color-text-muted);
}
</style>
