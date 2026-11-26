<script lang="ts">
import ArrowUp from "@lucide/svelte/icons/arrow-up";
import Paperclip from "@lucide/svelte/icons/paperclip";
import Slash from "@lucide/svelte/icons/slash";
import Square from "@lucide/svelte/icons/square";
import { Button, IconButton } from "@yaa/ui";
import ContextMeter from "./ContextMeter.svelte";
import type { ChatPanelController } from "./chat-panel.svelte.ts";
import type { Composer } from "./composer.svelte.ts";
import type { Transcript } from "./transcript.ts";

// Under the prompt: attaching and commands, the options the agent runs with,
// how full its context is, and send, which is stop while a turn runs.
let {
	composer,
	transcript,
	pickers,
	onpick,
	onstop,
}: {
	composer: Composer;
	transcript: Transcript;
	pickers: ChatPanelController["pickers"];
	onpick: ChatPanelController["pickOption"];
	onstop: () => void;
} = $props();
</script>

<div class="bar">
	<IconButton
		icon={Paperclip}
		label="Attach files"
		onclick={composer.pickFiles}
	/>
	<IconButton icon={Slash} label="Commands" onclick={composer.slash} />
	{#each pickers as picker (picker.category)}
		<Button
			variant="ghost"
			title={picker.name}
			onclick={() => onpick(picker.category)}
		>
			{picker.label}
		</Button>
	{/each}
	<div class="end">
		{#if transcript.usage}
			<ContextMeter usage={transcript.usage} />
		{/if}
		{#if transcript.running}
			<IconButton icon={Square} label="Stop" onclick={onstop} />
		{:else}
			<IconButton icon={ArrowUp} label="Send" onclick={composer.send} />
		{/if}
	</div>
</div>

<style>
.bar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-1);
}

.end {
	display: flex;
	align-items: center;
	gap: var(--spacing-1);
	margin-left: auto;
}
</style>
