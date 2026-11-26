<script lang="ts">
import { IconButton } from "@yaa/ui";
import type { PanelKind } from "@yaa/ui/dock";

// One toggle per panel kind, at the end of the header; the open ones are
// pressed. Pointing at or focusing an open panel's toggle shows where that
// panel is (`onpeek`).
let {
	kinds,
	isOpen,
	shortcut,
	ontoggle,
	onpeek,
}: {
	kinds: ReadonlyMap<string, PanelKind>;
	isOpen: (kind: string) => boolean;
	shortcut: (kind: string) => readonly string[] | undefined;
	ontoggle: (kind: string) => void;
	onpeek: (kind: string | undefined) => void;
} = $props();
</script>

<nav
	class="ml-auto flex shrink-0 items-center gap-0.5 pl-3"
	aria-label="Panels"
>
	{#each kinds as [id, kind] (id)}
		<IconButton
			icon={kind.icon}
			label={kind.title}
			shortcut={shortcut(id)}
			pressed={isOpen(id)}
			size="large"
			tooltipSide="bottom"
			onclick={() => ontoggle(id)}
			onpointerenter={() => onpeek(id)}
			onpointerleave={() => onpeek(undefined)}
			onfocus={() => onpeek(id)}
			onblur={() => onpeek(undefined)}
		/>
	{/each}
</nav>
