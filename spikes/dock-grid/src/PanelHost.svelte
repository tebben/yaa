<script lang="ts">
	import { portal, slots } from './dock.svelte';
	import { panelKinds } from './registry';
</script>

{#each slots as slot (slot.id)}
	{@const Panel = panelKinds[slot.kind].component}
	<svelte:boundary>
		<div class="panel-root" {@attach portal(slot.element)}>
			<Panel params={slot.params} panelId={slot.id} visible={slot.visible} />
		</div>
		{#snippet failed(error)}
			<div class="panel-root" {@attach portal(slot.element)}>panel failed: {String(error)}</div>
		{/snippet}
	</svelte:boundary>
{/each}

<style>
	.panel-root { height: 100%; }
</style>
