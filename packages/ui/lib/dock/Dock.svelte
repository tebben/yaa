<script lang="ts">
import DockTab from "./DockTab.svelte";
import type { DockController } from "./dock.svelte.ts";
import { portal } from "./portal.ts";

let { dock }: { dock: DockController } = $props();
</script>

<div class="size-full" {@attach dock.attach}></div>

<!-- dockview focuses a group when focus enters its content, so the content
     root takes focus from a click anywhere in the panel. -->
{#each dock.slots as slot (slot.element)}
	{#if slot.part === "tab"}
		<div class="size-full" {@attach portal(slot.element)}>
			<DockTab
				kind={slot.kind}
				title={slot.title}
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
					<slot.kind.component kind={slot.kindId} />
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
