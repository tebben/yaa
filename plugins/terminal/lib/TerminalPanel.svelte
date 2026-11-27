<script lang="ts">
import Plus from "@lucide/svelte/icons/plus";
import SquareTerminal from "@lucide/svelte/icons/terminal";
import type { PanelProps } from "@yaa/plugin-api/ui";
import { Icon, IconButton, TabStrip } from "@yaa/ui";
import { untrack } from "svelte";
import { createTerminalPanel } from "./terminal-panel.svelte.ts";

let { panel }: PanelProps = $props();
// A panel keeps its context for as long as it is open.
const context = untrack(() => panel);
const terminals = createTerminalPanel(context);
</script>

<div class="terminal">
	<!-- The header moves into the panel's, so it needs a parent of its own. -->
	<div>
		<div class="header" {@attach context.header}>
			<TabStrip
				tabs={terminals.tabs}
				label="Terminals"
				empty="Terminal"
				onselect={terminals.select}
				onclose={terminals.close}
			>
				{#snippet icon()}
					<Icon icon={SquareTerminal} />
				{/snippet}
				{#snippet after()}
					<IconButton
						icon={Plus}
						label="New terminal"
						onclick={terminals.create}
					/>
				{/snippet}
			</TabStrip>
		</div>
	</div>
	{#if terminals.problem}
		<p class="note problem">{terminals.problem}</p>
	{/if}
	{#if terminals.empty}
		<p class="note">No terminal is open. Use New terminal.</p>
	{/if}
	<div
		class="screen"
		{@attach context.captureKeys}
		{@attach terminals.attach}
	></div>
</div>

<style>
.terminal {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.header {
	height: 100%;
}

.screen {
	flex: 1;
	min-height: 0;
	padding: var(--spacing-2) 0 var(--spacing-1) var(--spacing-3);
}

.screen :global(.view) {
	height: 100%;
	overflow: hidden;
}

/* Text an input method is still composing, which xterm draws black on white
   otherwise. */
.screen :global(.composition-view) {
	background: var(--color-raised);
	color: var(--color-text);
}

.note {
	padding: var(--spacing-2) var(--spacing-3);
	color: var(--color-text-muted);
}

.problem {
	color: var(--color-state-error);
}
</style>
