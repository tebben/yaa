<script lang="ts">
import DockTab from "./DockTab.svelte";
import type { DockController } from "./dock.svelte.ts";
import { portal } from "./portal.ts";

let { dock }: { dock: DockController } = $props();
</script>

<!-- A full-screen panel lifts out of the grid over a dimmed window, like a
     dialog; a click beside it puts it back. -->
{#if dock.fullScreen}
	<div
		class="fixed inset-0 z-40 bg-chrome/60"
		role="presentation"
		onpointerdown={dock.exitFullScreen}
	></div>
{/if}
<div
	class={dock.fullScreen
		? "fixed inset-modal-inset z-40 overflow-hidden rounded-overlay border border-border-strong shadow-overlay"
		: "size-full"}
	{@attach dock.attach}
></div>

<!-- dockview focuses a group when focus enters its content, so the content
     root takes focus from a click anywhere in the panel. -->
{#each dock.slots as slot (slot.element)}
	{#if slot.part === "tab"}
		<div class="size-full" {@attach portal(slot.element)}>
			<DockTab
				kind={slot.kind}
				title={slot.title}
				header={dock.headerHost(slot.panelId)}
				ownHeader={dock.hasOwnHeader(slot.panelId)}
				fullScreen={dock.isFullScreen(slot.panelId)}
				ontogglefullscreen={() => dock.toggleFullScreen(slot.panelId)}
				onclose={() => dock.close(slot.panelId)}
			/>
		</div>
	{:else}
		<div
			class="size-full outline-none"
			tabindex="-1"
			{@attach portal(slot.element)}
			{@attach dock.trackFocus}
		>
			{#if slot.kind}
				<svelte:boundary>
					<slot.kind.component
						kind={slot.kindId}
						frame={dock.frame(slot.panelId)}
					/>
					{#snippet failed(error)}
						<p class="p-3 text-state-error">
							This panel failed: {String(error)}
						</p>
					{/snippet}
				</svelte:boundary>
			{:else}
				<p class="p-3 text-text-muted">
					Nothing provides the panel “{slot.kindId}” now.
				</p>
			{/if}
		</div>
	{/if}
{/each}
