<script lang="ts">
import { IconButton } from "@yaa/ui";
import type { PanelKind } from "@yaa/ui/dock";
import type { Attachment } from "svelte/attachments";

// One toggle per panel kind; the open ones are pressed.
let {
	kinds,
	isOpen,
	shortcut,
	ontoggle,
	region,
}: {
	kinds: ReadonlyMap<string, PanelKind>;
	isOpen: (kind: string) => boolean;
	shortcut: (kind: string) => string | undefined;
	ontoggle: (kind: string) => void;
	region: Attachment<HTMLElement>;
} = $props();
</script>

<nav
	{@attach region}
	class="yaa-focus-region col-start-3 row-span-3 row-start-1 flex w-rail flex-col items-center gap-1 border-l border-border bg-chrome py-1.5"
	aria-label="Panels"
>
	{#each kinds as [id, kind] (id)}
		<IconButton
			icon={kind.icon}
			label={kind.title}
			shortcut={shortcut(id)}
			pressed={isOpen(id)}
			tooltipSide="left"
			onclick={() => ontoggle(id)}
		/>
	{/each}
</nav>
