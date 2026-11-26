<script lang="ts">
import { Button } from "@yaa/ui";
import type { PanelProps } from "@yaa/ui/dock";
import { getPanelWorktree } from "../panel-worktree.ts";
import { getAgentChat } from "./agent-chat.svelte.ts";
import Composer from "./Composer.svelte";
import TranscriptEntry from "./TranscriptEntry.svelte";
import { foldTranscript } from "./transcript.ts";

// The chat panel until the chat arrives in M2: it streams turns from the
// fake agent, in dev mode (docs/spec/05-agents-chat.md).
let { kind }: PanelProps = $props();
const agentChat = getAgentChat();
const worktree = getPanelWorktree();
const chat = $derived(agentChat().in(worktree()));
const transcript = $derived(foldTranscript(chat.events));
</script>

{#if !chat.started}
	<div class="flex flex-col items-start gap-2 p-3 text-text-muted">
		<p>Until the chat arrives in M2, the {kind} panel plays the fake agent.</p>
		<Button onclick={chat.start}>Start a fake session</Button>
	</div>
{:else}
	<div class="flex h-full flex-col">
		<div
			class="flex items-center gap-3 border-b border-border px-3 py-1.5 text-sm text-text-muted"
		>
			<span class="flex-1 truncate text-text">
				{transcript.title ?? "Fake session"}
			</span>
			{#if transcript.usage}
				{@const { used, size, cost } = transcript.usage}
				<span>{Math.round((used / size) * 100)}% context</span>
				{#if cost}
					<span>{cost.amount.toFixed(3)} {cost.currency}</span>
				{/if}
			{/if}
		</div>
		{#if transcript.plan.length > 0}
			<ul class="border-b border-border px-3 py-1.5 text-sm">
				{#each transcript.plan as entry (entry.content)}
					<li
						class={entry.status === "completed"
							? "text-text-muted line-through"
							: "text-text-soft"}
					>
						{entry.content}
					</li>
				{/each}
			</ul>
		{/if}
		<ol class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
			{#each transcript.items as item (item.key)}
				<li>
					<TranscriptEntry
						{item}
						onpermission={chat.answerPermission}
						onanswer={chat.answerQuestion}
					/>
				</li>
			{/each}
		</ol>
		<Composer
			running={transcript.running}
			commands={transcript.commands}
			onsend={chat.prompt}
			oncancel={chat.cancel}
		/>
	</div>
{/if}
