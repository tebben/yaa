<script lang="ts">
	import { getContext, onMount } from 'svelte';

	let { params, panelId, visible }: { params: Record<string, unknown>; panelId: string; visible: boolean } = $props();
	const host = getContext<{ name: string }>('host');
	let count = $state(0);
	let text = $state('');
	let mountedAt = $state(0);
	onMount(() => (mountedAt = performance.now()));
</script>

<div class="body" data-panel={panelId}>
	<p>panel <b>{panelId}</b> · host context: <span class="ctx">{host?.name ?? 'missing'}</span> · visible: {visible}</p>
	<p>params: <span class="params">{JSON.stringify(params)}</span></p>
	<button class="inc" onclick={() => count++}>count <span class="count">{count}</span></button>
	<input class="text" bind:value={text} placeholder="type to test state retention" />
	<p class="mounted">mounted at {mountedAt.toFixed(0)}</p>
	<div class="scroll">{#each Array(200) as _, i}<div>line {i}</div>{/each}</div>
</div>

<style>
	.body { padding: 8px; height: 100%; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; }
	.scroll { flex: 1; overflow: auto; color: var(--color-text-muted); }
	p { margin: 0; }
</style>
