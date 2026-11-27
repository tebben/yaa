<script lang="ts">
import { IconButton } from "@yaa/ui";
import type { PanelKind } from "@yaa/ui/dock";

// One toggle per panel kind, at the end of the header
// (docs/decisions/0034): open panels are pressed. Pointing at or focusing
// an open panel's toggle shows where that panel is (`onpeek`).
let {
	kinds,
	open,
	shortcut,
	ontoggle,
	onpeek,
}: {
	kinds: ReadonlyMap<string, PanelKind>;
	open: readonly string[];
	shortcut: (kind: string) => readonly string[] | undefined;
	ontoggle: (kind: string) => void;
	onpeek: (kind: string | undefined) => void;
} = $props();

const peek = (id: string) => {
	if (open.includes(id)) onpeek(id);
};
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
			pressed={open.includes(id)}
			size="large"
			tooltipSide="bottom"
			onclick={() => ontoggle(id)}
			onpointerenter={() => peek(id)}
			onpointerleave={() => onpeek(undefined)}
			onfocus={() => peek(id)}
			onblur={() => onpeek(undefined)}
		/>
	{/each}
</nav>
