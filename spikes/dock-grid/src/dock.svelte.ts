import type {
	CreateComponentOptions,
	DockviewApi,
	GroupPanelPartInitParameters,
	IContentRenderer,
	ITabRenderer,
	TabPartInitParameters,
} from 'dockview-core';
import { mount, unmount } from 'svelte';
import { stats } from './stats';
import Tab from './Tab.svelte';

/**
 * One open panel. dockview owns `element`; PanelHost renders the panel's component inside the
 * app's own tree and moves its root node into `element`, so contexts and boundaries flow in.
 */
export type PanelSlot = {
	id: string;
	kind: string;
	element: HTMLElement;
	params: Record<string, unknown>;
	visible: boolean;
};

export const slots = $state<PanelSlot[]>([]);

class PortalContent implements IContentRenderer {
	readonly element = document.createElement('div');
	private slot?: PanelSlot;

	constructor(private readonly kind: string) {
		this.element.style.height = '100%';
	}
	init(p: GroupPanelPartInitParameters): void {
		slots.push({ id: p.api.id, kind: this.kind, element: this.element, params: p.params, visible: true });
		this.slot = slots[slots.length - 1];
		stats.mounts++;
	}
	update(event: { params: Record<string, unknown> }): void {
		if (this.slot) this.slot.params = { ...this.slot.params, ...event.params };
	}
	onShow(): void {
		if (this.slot) this.slot.visible = true;
	}
	onHide(): void {
		if (this.slot) this.slot.visible = false;
	}
	dispose(): void {
		const i = slots.indexOf(this.slot as PanelSlot);
		if (i >= 0) slots.splice(i, 1);
		stats.unmounts++;
	}
}

class SvelteTab implements ITabRenderer {
	readonly element = document.createElement('div');
	private instance?: ReturnType<typeof mount>;
	constructor(private readonly icon: (kind: string) => string) {}
	init(p: TabPartInitParameters): void {
		this.element.style.height = '100%';
		this.instance = mount(Tab, { target: this.element, props: { api: p.api, icon: this.icon(p.api.component) } });
		stats.tabMounts++;
	}
	dispose(): void {
		if (this.instance) unmount(this.instance);
		stats.tabUnmounts++;
	}
}

export function renderers(icon: (kind: string) => string) {
	return {
		createComponent: (o: CreateComponentOptions) => new PortalContent(o.name),
		createTabComponent: () => new SvelteTab(icon),
	};
}

/** Attachment: moves the node into dockview's element and removes it when the panel goes. */
export function portal(target: HTMLElement) {
	return (node: HTMLElement) => {
		target.appendChild(node);
		return () => node.remove();
	};
}

export type { DockviewApi };
