<script lang="ts">
	import { createDockview, type DockviewApi } from 'dockview-core';
	import { getAllContexts, onMount, setContext } from 'svelte';
	import { renderers } from './dock.svelte';
	import { closeActive, defaultLayout, focusDirection, movePanel, togglePanel } from './layout';
	import { panelKinds } from './registry';

	setContext('host', { name: 'yaa' });
	const context = getAllContexts();
	let el: HTMLDivElement;
	let api = $state<DockviewApi>();
	let open = $state<string[]>([]);

	onMount(() => {
		const dock = createDockview(el, {
			...renderers(context),
			className: 'yaa-dock',
			theme: { name: 'yaa', className: 'yaa-dock', gap: 0, colorScheme: 'dark' },
			disableFloatingGroups: true,
			singleTabMode: 'fullwidth',
			defaultRenderer: 'always',
			defaultTabComponent: 'svelte',
		});
		api = dock;
		const sync = () => (open = dock.panels.map((p) => p.id));
		dock.onDidLayoutChange(sync);
		defaultLayout(dock);
		Object.assign(globalThis, { __dock: dock, __layout: { defaultLayout, togglePanel, focusDirection, movePanel } });
		return () => dock.dispose();
	});

	// Stands in for the app's single key dispatcher (commands + keybindings).
	function onkeydown(e: KeyboardEvent) {
		if (!api) return;
		const arrows: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
		if (e.ctrlKey && e.key === 'w') closeActive(api);
		else if (e.altKey && e.shiftKey && arrows[e.key]) movePanel(api, arrows[e.key]);
		else if (e.altKey && arrows[e.key]) focusDirection(api, arrows[e.key]);
		else return;
		e.preventDefault();
	}
</script>

<svelte:window {onkeydown} />

<div class="shell">
	<div class="grid" bind:this={el}></div>
	<nav class="rail">
		{#each Object.entries(panelKinds) as [id, kind] (id)}
			<button class:on={open.includes(id)} title={kind.title} data-rail={id} onclick={() => api && togglePanel(api, id)}>{kind.icon}</button>
		{/each}
		<button title="Reset layout" onclick={() => api && defaultLayout(api)}>↺</button>
	</nav>
</div>

<style>
	.shell { display: flex; height: 100%; }
	.grid { flex: 1; min-width: 0; }
	.rail { width: 40px; display: flex; flex-direction: column; gap: 4px; padding: 4px; border-left: 1px solid var(--color-border); }
	.rail button { background: none; border: 0; color: var(--color-text-muted); height: 28px; border-radius: 4px; cursor: pointer; }
	.rail button.on { color: var(--color-accent); background: var(--color-accent-soft); }
</style>
