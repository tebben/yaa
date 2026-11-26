<script lang="ts">
import Icon from "../Icon.svelte";
import TabClose from "../TabClose.svelte";
import type { PanelKind } from "./dock.svelte.ts";

// A panel's tab: the whole header while the panel is alone in its group, one
// tab of a strip like the editor's file tabs when it shares it (dock.css).
// dockview colours the text by focus. A panel with a header of its own fills
// `header`, which takes the place of the icon and title.
let {
	kind,
	title,
	header,
	ownHeader,
	onclose,
}: {
	kind: PanelKind | undefined;
	title: string;
	header: HTMLElement;
	ownHeader: boolean;
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
	<span class="yaa-tab-actions ml-auto flex">
		<TabClose label={`Close ${title}`} onclick={onclose} />
	</span>
</div>
