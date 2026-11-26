<script lang="ts">
import type { QuestionAnswer } from "@yaa/contracts/agent-events";
import { Button } from "@yaa/ui";
import QuestionForm from "./QuestionForm.svelte";
import type { TranscriptItem } from "./transcript.ts";

// One item of the transcript, plainly: the chat's rendering (markdown,
// highlighted code, collapsible thinking) arrives in M2.
let {
	item,
	onpermission,
	onanswer,
}: {
	item: TranscriptItem;
	onpermission: (requestId: string, optionId: string) => void;
	onanswer: (requestId: string, answer: QuestionAnswer) => void;
} = $props();
</script>

{#if item.kind === "prompt"}
	<p class="rounded-control bg-raised px-2 py-1 text-text">{item.text}</p>
{:else if item.kind === "message"}
	<p class="whitespace-pre-wrap text-text">{item.text}</p>
{:else if item.kind === "thinking"}
	<p class="whitespace-pre-wrap text-text-muted italic">{item.text}</p>
{:else if item.kind === "tool"}
	<div class="rounded-control border border-border px-2 py-1">
		<p class="flex gap-2">
			<span class="flex-1 truncate text-text-soft">{item.title}</span>
			<span
				class={item.status === "failed"
					? "text-state-error"
					: "text-text-muted"}
			>
				{item.status.replace("_", " ")}
			</span>
		</p>
		{#each item.output as output, index (index)}
			{#if output.type === "text"}
				<pre
					class="overflow-x-auto font-mono text-sm text-text-muted"
				>{output.text}</pre>
			{:else if output.type === "diff"}
				<div class="font-mono text-sm text-text-soft">
					{#if output.oldText !== undefined}
						<pre
							class="overflow-x-auto bg-diff-removed px-1"
						>- {output.oldText}</pre>
					{/if}
					<pre
						class="overflow-x-auto bg-diff-added px-1"
					>+ {output.newText}</pre>
				</div>
			{/if}
		{/each}
	</div>
{:else if item.kind === "permission"}
	<div
		class="flex flex-col gap-1.5 rounded-control border border-state-attention px-2 py-1.5"
	>
		<p class="text-text">Allow “{item.title}”?</p>
		{#if item.answer === undefined}
			<div class="flex flex-wrap gap-1.5">
				{#each item.options as option (option.optionId)}
					<Button onclick={() => onpermission(item.requestId, option.optionId)}>
						{option.name}
					</Button>
				{/each}
			</div>
		{:else}
			<p class="text-text-muted">
				{item.options.find(({ optionId }) => optionId === item.answer)?.name ??
					"Cancelled"}
			</p>
		{/if}
	</div>
{:else if item.kind === "question"}
	<QuestionForm
		message={item.message}
		fields={item.fields}
		answered={item.answer}
		onanswer={(answer) => onanswer(item.requestId, answer)}
	/>
{:else if item.kind === "turn.end"}
	<p class="text-sm text-text-muted">
		Turn ended: {item.stopReason.replace("_", " ")}
	</p>
{:else if item.kind === "error"}
	<p class="text-state-error">{item.message}</p>
{/if}
