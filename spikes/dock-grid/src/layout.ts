import type { DockviewApi, GroupNavigationDirection, SerializedDockview } from 'dockview-core';
import { panelKinds } from './registry';

/** The default layout from docs/design/mockups/Main.png: changes | editor over terminal | chat. */
export function defaultLayout(api: DockviewApi): void {
	api.clear();
	const add = (id: string, position?: Parameters<DockviewApi['addPanel']>[0]['position']) =>
		api.addPanel({ id, component: id, title: panelKinds[id].title, position });
	add('changes');
	add('editor', { referencePanel: 'changes', direction: 'right' });
	add('chat', { referencePanel: 'editor', direction: 'right' });
	add('terminal', { referencePanel: 'editor', direction: 'below' });
}

/** Rail toggle: close the panel if open, otherwise open it to the right of the active group. */
export function togglePanel(api: DockviewApi, id: string): void {
	const existing = api.getPanel(id);
	if (existing) {
		existing.api.close();
		return;
	}
	const ref = api.activeGroup;
	api.addPanel({
		id,
		component: id,
		title: panelKinds[id].title,
		position: ref ? { referenceGroup: ref, direction: 'right' } : undefined,
	});
}

export function focusDirection(api: DockviewApi, dir: GroupNavigationDirection): void {
	const group = api.activeGroup;
	if (!group) return;
	const next = api.adjacentGroupInDirection(group, dir);
	next?.activePanel?.api.setActive();
}

const toDirection = { left: 'left', right: 'right', up: 'top', down: 'bottom' } as const;

/** Keyboard "move panel": split it off to the given side of its own group, or into the neighbour. */
export function movePanel(api: DockviewApi, dir: GroupNavigationDirection): void {
	const panel = api.activePanel;
	if (!panel) return;
	const group = panel.api.group;
	if (group.panels.length > 1) {
		panel.api.moveTo({ group, position: toDirection[dir] });
		return;
	}
	const next = api.adjacentGroupInDirection(group, dir);
	if (next) panel.api.moveTo({ group: next as typeof group, position: 'center' });
}

export function closeActive(api: DockviewApi): void {
	api.activePanel?.api.close();
}

export type Layout = SerializedDockview;
