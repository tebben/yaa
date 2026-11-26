<script lang="ts">
import { IconButton } from "@yaa/ui";
import type { PanelKind } from "@yaa/ui/dock";
import type { Attachment } from "svelte/attachments";

// One toggle per panel kind; the open ones are pressed. The rail is a card
// on the grid, as tall as its buttons.
let {
	kinds,
	isOpen,
	shortcut,
	ontoggle,
	region,
}: {
	kinds: ReadonlyMap<string, PanelKind>;
	isOpen: (kind: string) => boolean;
	shortcut: (kind: string) => readonly string[] | undefined;
	ontoggle: (kind: string) => void;
	region: Attachment<HTMLElement>;
} = $props();
</script>

<div class="col-start-3 row-start-2 bg-grid py-panel-gap pr-panel-gap">
	<nav
		{@attach region}
		class="yaa-focus-region flex flex-col gap-0.5 rounded-panel bg-rail p-1"
		aria-label="Panels"
	>
		{#each kinds as [id, kind] (id)}
			<IconButton
				icon={kind.icon}
				label={kind.title}
				shortcut={shortcut(id)}
				pressed={isOpen(id)}
				size="large"
				tooltipSide="left"
				onclick={() => ontoggle(id)}
			/>
		{/each}
	</nav>
</div>
