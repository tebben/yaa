<script lang="ts">
import { X } from "@lucide/svelte";
import IconButton from "../IconButton.svelte";
import type { PanelKind } from "./dock.svelte.ts";

// The panel header: dockview colours the text by focus (theme in styles.css).
let {
	kind,
	title,
	onclose,
}: { kind: PanelKind | undefined; title: string; onclose: () => void } =
	$props();
</script>

<div class="flex h-full min-w-0 items-center gap-1.5 pr-1 pl-2.5">
	{#if kind}
		<kind.icon class="size-3.5 shrink-0" aria-hidden="true" />
	{/if}
	<span class="flex-1 truncate">{title}</span>
	<IconButton icon={X} label="Close" onclick={onclose} />
</div>
