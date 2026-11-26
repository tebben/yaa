<script lang="ts">
	import type { DockviewPanelApi } from 'dockview-core';

	let { api, icon }: { api: DockviewPanelApi; icon: string } = $props();
	let title = $state('');
	$effect(() => {
		title = api.title ?? '';
		const sub = api.onDidTitleChange((e) => (title = e.title));
		return () => sub.dispose();
	});
</script>

<div class="tab">
	<span class="icon">{icon}</span>
	<span class="title">{title}</span>
	<button class="close" title="Close (Ctrl+W)" onpointerdown={(e) => e.stopPropagation()} onclick={() => api.close()}>×</button>
</div>

<style>
	.tab { display: flex; align-items: center; gap: 6px; height: 100%; padding: 0 8px; white-space: nowrap; min-width: 0; }
	.title { overflow: hidden; text-overflow: ellipsis; }
	.icon { color: var(--color-text-muted); }
	.close { background: none; border: 0; color: var(--color-text-muted); cursor: pointer; padding: 0 2px; }
	.close:hover { color: var(--color-text); }
</style>
