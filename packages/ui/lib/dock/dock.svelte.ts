import {
	createDockview,
	type DockviewApi,
	type GroupPanelPartInitParameters,
	type IDockviewPanel,
} from "dockview-core";
import { type Component, tick, untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { createFocusMemory } from "../focus/focus-memory.ts";
import type { IconSource } from "../icon-source.ts";
import { parseDockLayout } from "./dock-layout.ts";
import { neighbour } from "./neighbour.ts";

// What the grid passes a panel's component: the kind it renders, so one
// component can serve several kinds, such as every plugin panel.
export type PanelProps = { kind: string };

// A view the grid can show (docs/spec/01-ui-layout-theming.md). The kind's id
// is the map key; while each kind opens at most once it is the panel id too.
export type PanelKind = {
	title: string;
	icon: IconSource;
	component: Component<PanelProps>;
};

type Direction = "left" | "right" | "above" | "below" | "within";

export type DockDirection = "left" | "right" | "up" | "down";

// How far one resize step moves an edge, as a share of the grid.
const RESIZE_STEP = 0.05;

// One step of a default layout: a panel, and where it goes relative to one
// placed before it. The first step goes into the empty grid.
export type DockPlacement = {
	kind: string;
	beside?: { kind: string; direction: Direction };
};

export type DockOptions = {
	kinds: ReadonlyMap<string, PanelKind>;
	// The saved layout text; when missing or no longer valid, the default.
	layout: string | undefined;
	defaultLayout: readonly DockPlacement[];
	onChange(layout: string): void;
};

// dockview owns `element`. Dock.svelte renders the part inside the app's tree
// and moves it there, so context reaches panels (docs/decisions/0016).
export type DockSlot = {
	part: "content" | "tab";
	panelId: string;
	kindId: string;
	kind: PanelKind | undefined;
	title: string;
	element: HTMLElement;
};

const theme = {
	name: "yaa",
	className: "yaa-dock",
	gap: 0,
	colorScheme: "dark",
} as const;

export const createDock = ({
	kinds,
	layout,
	defaultLayout,
	onChange,
}: DockOptions) => {
	// Only ever pushed to and spliced, never reordered: a keyed each that moves
	// an item would move its node back out of dockview.
	const slots = $state<DockSlot[]>([]);
	let open = $state<ReadonlySet<string>>(new Set());
	let activeKind = $state<string>();
	let api: DockviewApi | undefined;
	// The grid's element, to tell whether focus is in the grid.
	let root: HTMLElement | undefined;
	// Coming back to a panel lands on the item that had focus there last.
	const memory = createFocusMemory();
	// The latest layout, so attaching again (a remount, hot reload in dev)
	// restores the grid as it was, not as it was loaded.
	let latest = layout;

	const renderer = (part: DockSlot["part"]) => {
		const element = document.createElement("div");
		element.className = "size-full";
		return {
			element,
			init({ api: panel, title }: GroupPanelPartInitParameters) {
				slots.push({
					part,
					panelId: panel.id,
					kindId: panel.component,
					kind: kinds.get(panel.component),
					title,
					element,
				});
			},
			dispose() {
				const index = slots.findIndex((slot) => slot.element === element);
				if (index >= 0) slots.splice(index, 1);
			},
		};
	};

	const add = (
		dock: DockviewApi,
		kind: string,
		position?: Parameters<DockviewApi["addPanel"]>[0]["position"],
	) => {
		dock.addPanel({
			id: kind,
			component: kind,
			title: kinds.get(kind)?.title ?? kind,
			...(position === undefined ? {} : { position }),
		});
	};

	const restore = (dock: DockviewApi) => {
		const saved = latest === undefined ? undefined : parseDockLayout(latest);
		if (saved !== undefined) {
			dock.fromJSON(saved);
			return;
		}
		for (const { kind, beside } of defaultLayout) {
			add(
				dock,
				kind,
				beside && {
					referencePanel: beside.kind,
					direction: beside.direction,
				},
			);
		}
	};

	// Makes the panel the active one and moves keyboard focus into it, out of
	// whatever had it, such as an input in another panel.
	const activate = (panel: IDockviewPanel | undefined) => {
		if (panel === undefined) return;
		panel.api.setActive();
		const slot = slots.find(
			(slot) => slot.part === "content" && slot.panelId === panel.id,
		);
		const content = slot?.element.firstElementChild;
		if (content instanceof HTMLElement) memory.enter(content);
	};

	// Opening or closing a panel moves focus only when it was in the grid:
	// toggling from the rail or the palette leaves it where it was.
	const settle = (panel: IDockviewPanel | undefined, hadFocus: boolean) => {
		if (hadFocus) activate(panel);
		else panel?.api.setActive();
	};

	const attach: Attachment<HTMLElement> = (element) =>
		// Creating panels writes to `slots`; untracked, so that does not rerun
		// the attachment and rebuild the grid.
		untrack(() => {
			const dock = createDockview(element, {
				createComponent: () => renderer("content"),
				createTabComponent: () => renderer("tab"),
				defaultTabComponent: "yaa",
				theme,
				singleTabMode: "fullwidth",
				disableFloatingGroups: true,
			});
			api = dock;
			root = element;
			restore(dock);
			const sync = () => {
				open = new Set(dock.panels.map((panel) => panel.id));
			};
			sync();
			const changes = dock.onDidLayoutChange(() => {
				sync();
				latest = JSON.stringify(dock.toJSON());
				onChange(latest);
			});
			const activeChanges = dock.onDidActivePanelChange(() => {
				activeKind = dock.activePanel?.api.component;
			});
			activeKind = dock.activePanel?.api.component;
			return () => {
				changes.dispose();
				activeChanges.dispose();
				dock.dispose();
				api = undefined;
				root = undefined;
			};
		});

	return {
		get slots(): readonly DockSlot[] {
			return slots;
		},
		attach,
		// Attached to each panel's content root by Dock.svelte.
		trackFocus: memory.track,
		isOpen(kind: string) {
			return open.has(kind);
		},
		// The kind of the focused panel, for `panel.kind` in when conditions.
		get activeKind() {
			return activeKind;
		},
		// Moves focus into the active panel, as it was when focus left the grid.
		focusActive() {
			activate(api?.activePanel);
		},
		// Focuses the group beside the active one; false at the grid's edge.
		focus(direction: DockDirection): boolean {
			const group = api?.activeGroup;
			if (api === undefined || group === undefined) return false;
			// dockview's own lookup compares centres, so from a wide panel it
			// misses the narrower ones beside it.
			const others = api.groups.filter((other) => other !== group);
			const index = neighbour(
				group.element.getBoundingClientRect(),
				others.map((other) => other.element.getBoundingClientRect()),
				direction,
			);
			const next = index === undefined ? undefined : others[index];
			if (next === undefined) return false;
			activate(next.activePanel);
			return true;
		},
		// The next or previous tab of the focused group, wrapping around.
		cycleTab(step: 1 | -1) {
			const group = api?.activeGroup;
			const panel = group?.activePanel;
			if (group === undefined || panel === undefined) return;
			const { panels } = group;
			const index = panels.indexOf(panel) + step;
			activate(panels[(index + panels.length) % panels.length]);
		},
		// Grows or shrinks the focused group by one step.
		resize(axis: "width" | "height", step: 1 | -1) {
			const group = api?.activeGroup;
			if (api === undefined || group === undefined) return;
			const size = group.api[axis] + step * RESIZE_STEP * api[axis];
			group.api.setSize(axis === "width" ? { width: size } : { height: size });
		},
		// Closes the focused tab and focuses the panel that takes its place.
		closeActive() {
			if (api === undefined) return;
			api.activePanel?.api.close();
			activate(api.activePanel);
		},
		reset() {
			if (api === undefined) return;
			api.clear();
			latest = undefined;
			restore(api);
		},
		close(panelId: string) {
			api?.getPanel(panelId)?.api.close();
		},
		// Closes the kind's panel, or opens it beside the focused group.
		toggle(kind: string) {
			if (api === undefined) return;
			const hadFocus = root?.contains(document.activeElement) === true;
			const panel = api.getPanel(kind);
			if (panel !== undefined) {
				// Closing a panel that is not the active one would make whichever
				// group dockview picks active; keep the one that was.
				const active = api.activePanel;
				panel.api.close();
				settle(active === panel ? api.activePanel : active, hadFocus);
				return;
			}
			const group = api.activeGroup;
			add(api, kind, group && { referenceGroup: group, direction: "right" });
			// The new panel's content renders on the next tick; dockview may
			// have moved the focused element out of the page meanwhile.
			void tick().then(() => settle(api?.getPanel(kind), hadFocus));
		},
	};
};

export type DockController = ReturnType<typeof createDock>;
