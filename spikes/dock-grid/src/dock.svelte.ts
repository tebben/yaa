import type {
	CreateComponentOptions,
	DockviewApi,
	GroupPanelPartInitParameters,
	IContentRenderer,
	ITabRenderer,
	TabPartInitParameters,
} from 'dockview-core';
import { mount, unmount } from 'svelte';
import { panelKinds } from './registry';
import { stats } from './stats';
import Tab from './Tab.svelte';

type Mounted = ReturnType<typeof mount>;

/** Mounts a Svelte 5 component into a dockview panel; props are a $state object so params updates flow in. */
class SvelteContent implements IContentRenderer {
	readonly element = document.createElement('div');
	private instance?: Mounted;
	private props = $state<{ params: Record<string, unknown>; panelId: string; visible: boolean }>({
		params: {},
		panelId: '',
		visible: true,
	});

	constructor(
		private readonly kind: string,
		private readonly context: Map<unknown, unknown>,
	) {
		this.element.style.height = '100%';
	}

	init(p: GroupPanelPartInitParameters): void {
		this.props.params = p.params;
		this.props.panelId = p.api.id;
		this.instance = mount(panelKinds[this.kind].component, {
			target: this.element,
			props: this.props,
			context: this.context,
		});
		stats.mounts++;
	}
	update(event: { params: Record<string, unknown> }): void {
		this.props.params = { ...this.props.params, ...event.params };
	}
	onShow(): void {
		this.props.visible = true;
	}
	onHide(): void {
		this.props.visible = false;
	}
	dispose(): void {
		if (this.instance) unmount(this.instance);
		stats.unmounts++;
	}
}

class SvelteTab implements ITabRenderer {
	readonly element = document.createElement('div');
	private instance?: Mounted;
	init(p: TabPartInitParameters): void {
		this.element.style.height = '100%';
		this.instance = mount(Tab, { target: this.element, props: { api: p.api, icon: panelKinds[p.api.component]?.icon ?? '' } });
		stats.tabMounts++;
	}
	dispose(): void {
		if (this.instance) unmount(this.instance);
		stats.tabUnmounts++;
	}
}

export function renderers(context: Map<unknown, unknown>) {
	return {
		createComponent: (o: CreateComponentOptions) => new SvelteContent(o.name, context),
		createTabComponent: () => new SvelteTab(),
	};
}

export type { DockviewApi };
