<script lang="ts">
// The slash commands and skills that match what is typed, over the composer.
// Keys move and accept; the list takes no focus, so typing goes on.
let {
	commands,
	selected,
	onaccept,
}: {
	commands: readonly { name: string; description: string }[];
	selected: number;
	onaccept: (name: string) => void;
} = $props();
</script>

<div class="suggestions" role="listbox" aria-label="Commands">
	{#each commands as command, index (command.name)}
		<button
			type="button"
			role="option"
			tabindex="-1"
			aria-selected={index === selected}
			onpointerdown={(event) => event.preventDefault()}
			onclick={() => onaccept(command.name)}
			{@attach index === selected
				? (node: Element) => node.scrollIntoView({ block: "nearest" })
				: undefined}
		>
			<span class="name">/{command.name}</span>
			<span class="description">{command.description}</span>
		</button>
	{/each}
</div>

<style>
.suggestions {
	position: absolute;
	right: var(--spacing-3);
	bottom: 100%;
	left: var(--spacing-3);
	z-index: 1;
	max-height: calc(var(--spacing-row) * 9);
	overflow-y: auto;
	padding: var(--spacing-1);
	border: 1px solid var(--color-border-strong);
	border-radius: var(--radius-overlay);
	background: var(--color-overlay);
	box-shadow: var(--shadow-overlay);
}

button {
	display: flex;
	align-items: baseline;
	gap: var(--spacing-3);
	width: 100%;
	padding: var(--spacing-1) var(--spacing-2);
	border-radius: var(--radius-control);
	text-align: left;
}

button[aria-selected="true"] {
	background: var(--color-selection);
}

.name {
	flex: none;
	font-family: var(--font-mono);
	font-size: var(--text-sm);
}

.description {
	overflow: hidden;
	color: var(--color-text-muted);
	font-size: var(--text-xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
