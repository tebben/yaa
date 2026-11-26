<script lang="ts">
import { Kbd } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";
import type { PaletteController } from "./palette.svelte.ts";

let { palette }: { palette: PaletteController } = $props();

const focus: Attachment<HTMLElement> = (node) => node.focus();
const intoView: Attachment<HTMLElement> = (node) =>
	node.scrollIntoView({ block: "nearest" });
const optionId = (index: number) => `palette-option-${index}`;
</script>

{#if palette.source}
	{@const source = palette.source}
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
			aria-label={source.label}
		>
			<div class="flex items-center gap-2 border-b border-border px-4">
				<!-- Keyed by the source, so a step that follows another gets focus. -->
				{#key source}
					<input
						class="flex-1 bg-transparent py-2.5 text-lg text-text outline-none placeholder:text-text-muted"
						placeholder={source.placeholder}
						spellcheck="false"
						role="combobox"
						aria-expanded="true"
						aria-controls="palette-options"
						aria-activedescendant={optionId(palette.selected)}
						bind:value={() => palette.query, (text) => (palette.query = text)}
						{@attach focus}
					>
				{/key}
				<Kbd keys={["Esc"]} />
			</div>
			{#if source.notes && source.notes.length > 0}
				<ul class="flex flex-col gap-0.5 border-b border-border px-4 py-2">
					{#each source.notes as note (note)}
						<li class="text-state-attention">{note}</li>
					{/each}
				</ul>
			{/if}
			<div
				id="palette-options"
				class="flex flex-col gap-0.5 overflow-y-auto p-1.5"
				role="listbox"
			>
				{#each palette.items as item, index (item.id)}
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
						<span class={["flex-1 truncate", item.mono && "font-mono"]}
							>{item.label}</span
						>
						{#if item.keys}
							<Kbd keys={item.keys} />
						{/if}
						{#if item.detail}
							<span class="shrink-0 text-text-muted">{item.detail}</span>
						{/if}
					</button>
				{:else}
					<p class="px-2.5 py-1.5 text-text-muted">
						{source.empty(palette.query)}
					</p>
				{/each}
			</div>
		</div>
	</div>
{/if}
