<script lang="ts">
import PanelLeftClose from "@lucide/svelte/icons/panel-left-close";
import { IconButton } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";

// The project list arrives with projects in M2 (docs/spec/02-worktrees.md).
// `region` makes it a place keyboard focus can move to. Once hidden, the
// header shows the button that brings the menu back.
let {
	region,
	shortcut,
	onhide,
}: {
	region: Attachment<HTMLElement>;
	shortcut: string | undefined;
	onhide: () => void;
} = $props();
</script>

<nav
	class="yaa-focus-region col-start-1 row-span-2 row-start-1 flex w-menu flex-col border-r border-border bg-menu"
	aria-label="Projects"
	{@attach region}
>
	<!-- The same height and bottom border as the header, so the toggle sits
	     at the same pixel in both places. -->
	<div
		class="flex h-header shrink-0 items-center gap-1.5 border-b border-menu-border px-1.5"
	>
		<IconButton
			icon={PanelLeftClose}
			label="Hide left menu"
			{shortcut}
			tooltipSide="bottom"
			onclick={onhide}
		/>
		<span
			class="text-wordmark leading-none font-semibold tracking-[-0.035em] text-text select-none"
			>yaa</span
		>
	</div>
	<h2 class="px-3 py-1 text-xs tracking-wide text-text-muted uppercase">
		Projects
	</h2>
	<p class="px-3 py-1 text-text-muted">No projects yet.</p>
</nav>
