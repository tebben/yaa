<script lang="ts">
import { Maximize2, Minimize2 } from "@lucide/svelte";
import Icon from "../Icon.svelte";
import TabButton from "../TabButton.svelte";
import TabClose from "../TabClose.svelte";
import type { PanelKind } from "./dock.svelte.ts";

// A panel's tab: the whole header while the panel is alone in its group, one
// tab of a strip like the editor's file tabs when it shares it (dock.css).
// dockview colours the text by focus. A panel with a header of its own fills
// `header`, which takes the place of the icon and title. Its actions show
// the panel full screen, or the grid again, and close it.
let {
	kind,
	title,
	header,
	ownHeader,
	fullScreen,
	ontogglefullscreen,
	onclose,
}: {
	kind: PanelKind | undefined;
	title: string;
	header: HTMLElement;
	ownHeader: boolean;
	fullScreen: boolean;
	ontogglefullscreen: () => void;
	onclose: () => void;
} = $props();
</script>

<div
	class={[
		"flex h-full min-w-0 items-center gap-1 pr-1.5",
		!ownHeader && "pl-3",
	]}
>
	{#if !ownHeader}
		<span class="flex min-w-0 items-center gap-2">
			{#if kind}
				<Icon icon={kind.icon} class="size-3.5 shrink-0" />
			{/if}
			<span class="truncate font-medium">{title}</span>
		</span>
	{/if}
	<div
		class={ownHeader ? "h-full min-w-0 flex-1" : "hidden"}
		{@attach (node) => node.append(header)}
	></div>
	<!-- A full-screen panel keeps its actions in sight, to go back. -->
	<span class={["ml-auto flex gap-1", !fullScreen && "yaa-tab-actions"]}>
		<TabButton
			label={fullScreen ? "Show the grid again" : `Show ${title} full screen`}
			onclick={ontogglefullscreen}
		>
			<Icon icon={fullScreen ? Minimize2 : Maximize2} />
		</TabButton>
		<TabClose label={`Close ${title}`} onclick={onclose} />
	</span>
</div>
