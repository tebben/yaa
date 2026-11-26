import type { Component } from 'svelte';
import Counter from './panels/Counter.svelte';
import Placeholder from './panels/Placeholder.svelte';

export type PanelKind = { component: Component<any>; title: string; icon: string };

/** Stands in for the plugin host's panel contributions: id, title, icon, component. */
export const panelKinds: Record<string, PanelKind> = {
	changes: { component: Counter, title: 'Changes', icon: '±' },
	editor: { component: Counter, title: 'tile-cache.ts', icon: '▤' },
	chat: { component: Counter, title: 'Chat 1', icon: '◌' },
	terminal: { component: Counter, title: 'Terminal', icon: '›_' },
	files: { component: Placeholder, title: 'Files', icon: '▦' },
	review: { component: Placeholder, title: 'Review', icon: '✓' },
	usage: { component: Placeholder, title: 'Usage', icon: '$' },
	workflows: { component: Placeholder, title: 'Workflows', icon: 'ϟ' },
};
