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
	<!-- The name and the path share a baseline, and the row they make is
	     centred in the header; icons are centred in that row. The menu
	     button's holder has no height, so the row is as tall as the text,
	     and the name's padding below lowers the row's centre to the middle
	     of its lowercase letters. -->
	<div class="flex min-w-0 flex-1 items-baseline">
		<div
			class={[
				"flex shrink-0 items-baseline gap-1.5 pl-1.5",
				menuOpen && "w-menu",
			]}
		>
			<span class="flex h-0 items-center self-center">
				<IconButton
					icon={menuOpen ? PanelLeftClose : PanelLeftOpen}
					label={menuOpen ? "Hide left menu" : "Show left menu"}
					shortcut={menuShortcut}
					size="large"
					tooltipSide="bottom"
					onclick={ontogglemenu}
				/>
			</span>
			<span
				class="pb-0.5 text-wordmark leading-none font-semibold tracking-[-0.035em] text-text select-none"
				>yaa</span
			>
		</div>
		<!-- The grid's gap and a panel's inset, so the text lines up with the
		     content of the leftmost panel. The path stays a step below the
		     name: parents muted, the step that is open soft and medium, and
		     the slashes quieter than either. A mono name, such as a branch, is
		     a size smaller so it reads as large as the rest. -->
		<div
			class="ml-panel-gap flex min-w-0 items-baseline gap-2 pl-3 text-md leading-none"
		>
			{#each crumbs as crumb, index (index)}
				{#if index > 0}
					<span class="text-border-strong" aria-hidden="true">/</span>
				{/if}
				<span
					class={[
						"flex min-w-0 items-baseline gap-1.5",
						index === crumbs.length - 1
							? "font-medium text-text-soft"
							: "text-text-muted",
					]}
				>
					<Icon icon={crumb.icon} class="size-3.5 self-center" />
					<span class={["truncate", crumb.mono && "font-mono text-sm"]}
						>{crumb.label}</span
					>
				</span>
			{:else}
				<span class="truncate">No project selected</span>
			{/each}
		</div>
	</div>
	{@render end?.()}
</header>
