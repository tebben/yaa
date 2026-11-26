<script lang="ts">
import { keyParts } from "@yaa/commands/key-chord";
import { Kbd } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";
import type { PaletteController } from "./palette.svelte.ts";

let {
	palette,
	keysFor,
}: {
	palette: PaletteController;
	keysFor: (id: string) => readonly string[];
} = $props();

const focus: Attachment<HTMLElement> = (node) => node.focus();
const intoView: Attachment<HTMLElement> = (node) =>
	node.scrollIntoView({ block: "nearest" });
const optionId = (index: number) => `palette-option-${index}`;
</script>

{#if palette.open}
	<div
		class="fixed inset-0 z-50 flex justify-center bg-chrome/60 pt-palette-offset"
		role="presentation"
		onpointerdown={(event) => {
			if (event.target === event.currentTarget) palette.hide();
		}}
	>
		<div
			class="flex h-fit max-h-2/3 w-palette flex-col overflow-hidden rounded-overlay border border-border-strong bg-overlay shadow-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
		>
			<div class="flex items-center gap-2 border-b border-border px-4">
				<input
					class="flex-1 bg-transparent py-2.5 text-lg text-text outline-none placeholder:text-text-muted"
					placeholder="Type a command"
					role="combobox"
					aria-expanded="true"
					aria-controls="palette-options"
					aria-activedescendant={optionId(palette.selected)}
					bind:value={() => palette.query, (text) => (palette.query = text)}
					{@attach focus}
				>
				<Kbd keys={["Esc"]} />
			</div>
			<div
				id="palette-options"
				class="flex flex-col gap-0.5 overflow-y-auto p-1.5"
				role="listbox"
			>
				{#each palette.entries as command, index (command.id)}
					{@const selected = index === palette.selected}
					<button
						type="button"
						tabindex="-1"
						id={optionId(index)}
						class="flex items-center gap-3 rounded-control px-2.5 py-1.5 text-left aria-selected:bg-selection"
						role="option"
						aria-selected={selected}
						onpointermove={() => {
							if (!selected) palette.select(index);
						}}
						onclick={() => {
							palette.select(index);
							palette.runSelected();
						}}
						{@attach selected ? intoView : undefined}
					>
						<span class="flex-1 truncate">{command.title}</span>
						{#each keysFor(command.id).slice(0, 1) as key (key)}
							<Kbd keys={keyParts(key)} />
						{/each}
						{#if command.category}
							<span class="text-text-muted">{command.category}</span>
						{/if}
					</button>
				{:else}
					<p class="px-2.5 py-1.5 text-text-muted">No matching commands</p>
				{/each}
			</div>
		</div>
	</div>
{/if}
