<script lang="ts">
import RefreshCw from "@lucide/svelte/icons/refresh-cw";
import type { PanelProps } from "@yaa/plugin-api/ui";
import { IconButton, Segmented } from "@yaa/ui";
import { createMcpSkillsPanel } from "./mcp-skills-panel.svelte.ts";
import { LAYER_CHOICES } from "./rows.ts";
import ToggleSection from "./ToggleSection.svelte";

let { panel }: PanelProps = $props();
// A panel keeps its context for as long as it lives.
// svelte-ignore state_referenced_locally
const view = createMcpSkillsPanel(panel);
</script>

<div class="panel">
	<div class="bar">
		<Segmented
			label="Where to switch"
			value={view.layer}
			options={LAYER_CHOICES}
			onchange={view.showLayer}
		/>
		<IconButton icon={RefreshCw} label="Read again" onclick={view.refresh} />
	</div>
	<div class="body">
		<p class="note">
			Changes apply to new chats, and to a chat once you restart its agent.
		</p>
		{#if view.failure}
			<p class="failure" role="alert">{view.failure}</p>
		{/if}
		{#each view.problems as { provider, problem } (provider)}
			<p class="failure" role="alert">{provider}: {problem}</p>
		{/each}
		{#if view.lists}
			{#each view.lists as list (list.kind)}
				<ToggleSection {list} onset={view.set} />
			{/each}
		{:else if !view.failure}
			<p class="note">Reading…</p>
		{/if}
	</div>
</div>

<style>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.bar {
	display: flex;
	flex: none;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-2);
	padding: var(--spacing-1_5) var(--spacing-3);
	border-bottom: 1px solid var(--color-border);
}

.body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
}

.note,
.failure {
	padding: var(--spacing-1_5) var(--spacing-3);
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}

.failure {
	color: var(--color-state-error);
	user-select: text;
}
</style>
