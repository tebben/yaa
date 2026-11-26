<script lang="ts">
import { IconButton } from "@yaa/ui";
import type { PanelKind } from "@yaa/ui/dock";

// One toggle per panel kind; the open ones are pressed.
let {
	kinds,
	isOpen,
	ontoggle,
}: {
	kinds: ReadonlyMap<string, PanelKind>;
	isOpen: (kind: string) => boolean;
	ontoggle: (kind: string) => void;
} = $props();
</script>

<nav
	class="col-start-3 row-span-3 row-start-1 flex w-rail flex-col items-center gap-1 border-l border-border bg-chrome py-1.5"
	aria-label="Panels"
>
	{#each kinds as [id, kind] (id)}
		<IconButton
			icon={kind.icon}
			label={kind.title}
			pressed={isOpen(id)}
			onclick={() => ontoggle(id)}
		/>
	{/each}
</nav>
