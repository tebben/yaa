<script lang="ts">
import Markdown from "./Markdown.svelte";
import Permission from "./Permission.svelte";
import Prompt from "./Prompt.svelte";
import QuestionForm from "./QuestionForm.svelte";
import Thinking from "./Thinking.svelte";
import ToolCall from "./ToolCall.svelte";
import type { TranscriptItem } from "./transcript.ts";
import type { TranscriptView } from "./transcript-view.svelte.ts";

// One item of the transcript. `streaming` while the agent still writes it.
let {
	item,
	view,
	streaming,
}: { item: TranscriptItem; view: TranscriptView; streaming: boolean } =
	$props();
</script>

{#if item.kind === "prompt"}
	<Prompt text={item.text} attachments={item.attachments} {view} />
{:else if item.kind === "message"}
	<Markdown text={item.text} {view} {streaming} />
{:else if item.kind === "thinking"}
	<Thinking
		text={item.text}
		{streaming}
		open={view.isOpen(item.key, false)}
		ontoggle={() => view.toggle(item.key, false)}
		{view}
	/>
{:else if item.kind === "tool"}
	<ToolCall {item} {view} />
{:else if item.kind === "permission"}
	<Permission
		title={item.title}
		options={item.options}
		answer={item.answer}
		onanswer={(option) => view.answerPermission(item.requestId, option)}
	/>
{:else if item.kind === "question"}
	<QuestionForm
		message={item.message}
		fields={item.fields}
		answered={item.answer}
		values={view.values(item.key)}
		onset={(name, value) => view.setValue(item.key, name, value)}
		onanswer={(answer) => view.answerQuestion(item.requestId, answer)}
	/>
{:else if item.kind === "stopped"}
	<p class="stopped">
		{item.reason === "cancelled"
			? "Stopped"
			: `Turn ended: ${item.reason.replaceAll("_", " ")}`}
	</p>
{:else if item.kind === "error"}
	<p class="error">{item.message}</p>
{/if}

<style>
.stopped {
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}

.error {
	color: var(--color-state-error);
	white-space: pre-wrap;
}
</style>
