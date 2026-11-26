<script lang="ts">
import { X } from "@lucide/svelte";
import Icon from "../Icon.svelte";
import IconButton from "../IconButton.svelte";
import type { PanelKind } from "./dock.svelte.ts";

// The panel header: dockview colours the text by focus, and the close button
// shows while the header is hovered (dock.css).
let {
	kind,
	title,
	onclose,
}: { kind: PanelKind | undefined; title: string; onclose: () => void } =
	$props();
</script>

<div class="flex h-full min-w-0 items-center gap-1.5 pr-1 pl-2.5">
	{#if kind}
		<Icon icon={kind.icon} class="size-3.5 shrink-0" />
	{/if}
	<span class="flex-1 truncate font-semibold">{title}</span>
	<span class="yaa-tab-actions flex">
		<IconButton icon={X} label="Close" onclick={onclose} />
	</span>
</div>
