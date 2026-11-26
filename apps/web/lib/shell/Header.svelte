<script lang="ts">
import PanelLeftOpen from "@lucide/svelte/icons/panel-left-open";
import { IconButton } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";

// Shows the selected project and worktree, with plugin slots, once projects
// arrive in M2. While the left menu is hidden, the button that shows it
// again leads the header, where the menu's own button was.
let {
	region,
	menuOpen,
	menuShortcut,
	onshowmenu,
}: {
	region: Attachment<HTMLElement>;
	menuOpen: boolean;
	menuShortcut: string | undefined;
	onshowmenu: () => void;
} = $props();
</script>

<header
	{@attach region}
	class={[
		"yaa-focus-region col-start-2 row-start-1 flex h-header items-center gap-1.5 border-b border-border bg-chrome pr-3 text-text-muted",
		menuOpen ? "pl-3" : "pl-1.5",
	]}
>
	{#if !menuOpen}
		<IconButton
			icon={PanelLeftOpen}
			label="Show left menu"
			shortcut={menuShortcut}
			tooltipSide="bottom"
			onclick={onshowmenu}
		/>
	{/if}
	No project selected
</header>
