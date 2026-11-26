<script lang="ts">
import type { PanelProps } from "@yaa/plugin-api/ui";
import { Button } from "@yaa/ui";
import ChatTitle from "./ChatTitle.svelte";
import Composer from "./Composer.svelte";
import { createChatPanel } from "./chat-panel.svelte.ts";
import Plan from "./Plan.svelte";
import ProviderList from "./ProviderList.svelte";
import Transcript from "./Transcript.svelte";

let { panel }: PanelProps = $props();
// A panel keeps its context for as long as it lives.
// svelte-ignore state_referenced_locally
const chat = createChatPanel(panel);
// svelte-ignore state_referenced_locally
const header = panel.header;
</script>

<div class="header" {@attach header}>
	<ChatTitle title={chat.title} onswitch={chat.pickChat} onnew={chat.newChat} />
</div>

<div class="chat">
	{#if chat.shown}
		{@const { id, transcript } = chat.shown}
		<p class="agent">{chat.agent.join(" · ")}</p>
		{#if transcript.plan.length > 0}
			<Plan entries={transcript.plan} />
		{/if}
		{#key id}
			<Transcript {transcript} view={chat.view} />
		{/key}
	{:else if chat.read}
		<div class="start">
			<ProviderList
				providers={chat.providers}
				starting={chat.starting}
				onstart={chat.start}
			/>
			{#if chat.hasChats}
				<Button onclick={chat.back}>Back to the chat</Button>
			{/if}
		</div>
	{:else}
		<div class="start"></div>
	{/if}
	{#if chat.failure}
		<p class="failure" role="alert">{chat.failure}</p>
	{/if}
	{#if chat.shown}
		<Composer
			composer={chat.composer}
			transcript={chat.shown.transcript}
			pickers={chat.pickers}
			onpick={chat.pickOption}
			onstop={chat.stop}
		/>
	{/if}
</div>

<style>
.header {
	height: 100%;
	min-width: 0;
}

.chat {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.agent {
	flex: none;
	overflow: hidden;
	padding: var(--spacing-1_5) var(--spacing-3);
	border-bottom: 1px solid var(--color-border);
	color: var(--color-text-muted);
	font-size: var(--text-sm);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.start {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing-4);
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing-3);
}

.failure {
	flex: none;
	padding: var(--spacing-1_5) var(--spacing-3);
	color: var(--color-state-error);
	user-select: text;
}
</style>
