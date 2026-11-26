<script lang="ts">
import PanelLeftClose from "@lucide/svelte/icons/panel-left-close";
import PanelLeftOpen from "@lucide/svelte/icons/panel-left-open";
import { IconButton } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";

// Spans the window. It leads with the button that hides or shows the left
// menu and the name, which keep their place either way; while the menu is
// open they take its width, so the project lines up with the grid. The
// project and worktree, with plugin slots, arrive with projects in M2.
let {
	region,
	menuOpen,
	menuShortcut,
	ontogglemenu,
}: {
	region: Attachment<HTMLElement>;
	menuOpen: boolean;
	menuShortcut: readonly string[] | undefined;
	ontogglemenu: () => void;
} = $props();
</script>

<header
	{@attach region}
	class="yaa-focus-region col-span-3 col-start-1 row-start-1 flex h-header items-center border-b border-border bg-chrome pr-3 text-text-muted"
>
	<div
		class={["flex shrink-0 items-center gap-1.5 pl-1.5", menuOpen && "w-menu"]}
	>
		<IconButton
			icon={menuOpen ? PanelLeftClose : PanelLeftOpen}
			label={menuOpen ? "Hide left menu" : "Show left menu"}
			shortcut={menuShortcut}
			tooltipSide="bottom"
			onclick={ontogglemenu}
		/>
		<span
			class="text-wordmark leading-none font-semibold tracking-[-0.035em] text-text select-none"
			>yaa</span
		>
	</div>
	<!-- The grid's gap and a panel's inset, so the text lines up with the
	     content of the leftmost panel. -->
	<span class="ml-panel-gap truncate pl-3">No project selected</span>
</header>
