<script lang="ts">
import PanelLeftClose from "@lucide/svelte/icons/panel-left-close";
import PanelLeftOpen from "@lucide/svelte/icons/panel-left-open";
import { Icon, IconButton } from "@yaa/ui";
import type { Snippet } from "svelte";
import type { Attachment } from "svelte/attachments";
import type { Crumb } from "./crumb.ts";

// Spans the window. It leads with the button that hides or shows the left
// menu and the name, which keep their place either way; while the menu is
// open they take its width, so the project lines up with the grid. Then the
// selected project and what of it the grid shows, and at the end `end`, the
// panel toggles while a worktree is open. Plugin slots come later.
let {
	region,
	menuOpen,
	menuShortcut,
	ontogglemenu,
	crumbs,
	end,
}: {
	region: Attachment<HTMLElement>;
	menuOpen: boolean;
	menuShortcut: readonly string[] | undefined;
	ontogglemenu: () => void;
	crumbs: readonly Crumb[];
	end?: Snippet;
} = $props();
</script>

<header
	{@attach region}
	class="yaa-focus-region col-span-2 col-start-1 row-start-1 flex h-header items-center border-b border-border bg-chrome pr-1.5 text-text-muted"
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
	<div class="ml-panel-gap flex min-w-0 items-center gap-2 pl-3">
		{#each crumbs as crumb, index (index)}
			{#if index > 0}
				<span aria-hidden="true">/</span>
			{/if}
			<span
				class={[
					"flex min-w-0 items-center gap-1.5",
					index === crumbs.length - 1 && "text-text",
				]}
			>
				<Icon icon={crumb.icon} class="size-3.5 text-text-muted" />
				<span class={["truncate", crumb.mono && "font-mono"]}
					>{crumb.label}</span
				>
			</span>
		{:else}
			<span class="truncate">No project selected</span>
		{/each}
	</div>
	{@render end?.()}
</header>
