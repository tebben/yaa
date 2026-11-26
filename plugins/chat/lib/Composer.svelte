<script lang="ts">
import AttachmentChip from "./AttachmentChip.svelte";
import ComposerBar from "./ComposerBar.svelte";
import type { ChatPanelController } from "./chat-panel.svelte.ts";
import type { Composer } from "./composer.svelte.ts";
import Suggestions from "./Suggestions.svelte";
import type { Transcript } from "./transcript.ts";

// Where a prompt is written: its attachments, the text, the options it runs
// with, and send, which is stop while a turn runs.
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

<form
	onsubmit={(event) => {
		event.preventDefault();
		composer.send();
	}}
>
	{#if composer.suggestions.length > 0}
		<Suggestions
			commands={composer.suggestions}
			selected={composer.selected}
			onaccept={composer.accept}
		/>
	{/if}
	<div class="box">
		{#if composer.draft.attachments.length > 0}
			<div class="attachments">
				{#each composer.draft.attachments as attachment, index (index)}
					<AttachmentChip
						{attachment}
						onremove={() => composer.remove(index)}
					/>
				{/each}
			</div>
		{/if}
		<textarea
			rows="2"
			placeholder="Message the agent. / for commands."
			aria-label="Prompt"
			bind:value={() => composer.draft.text, composer.setText}
			{@attach composer.input}
			onfocus={() => composer.focused(true)}
			onblur={() => composer.focused(false)}
			onpaste={(event) => {
				if (composer.paste(event.clipboardData?.files ?? [])) {
					event.preventDefault();
				}
			}}
		></textarea>
		<ComposerBar {composer} {transcript} {pickers} {onpick} {onstop} />
	</div>
</form>

<style>
form {
	position: relative;
	flex: none;
	padding: var(--spacing-2) var(--spacing-3) var(--spacing-3);
}

.box {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-1_5);
	padding: var(--spacing-2);
	border: 1px solid var(--color-border-strong);
	border-radius: var(--radius-panel);
}

.box:focus-within {
	border-color: var(--color-focus);
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-1);
}

textarea {
	field-sizing: content;
	max-height: calc(var(--spacing-row) * 8);
	resize: none;
	background: transparent;
	color: var(--color-text);
	outline: none;
}

textarea::placeholder {
	color: var(--color-text-muted);
}
</style>
