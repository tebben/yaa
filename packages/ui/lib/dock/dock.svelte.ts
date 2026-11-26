import {
	type AddPanelOptions,
	createDockview,
	type DockviewApi,
	type GroupPanelPartInitParameters,
	type IDockviewPanel,
} from "dockview-core";
import { type Component, tick, untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { SvelteSet } from "svelte/reactivity";
import { createFocusMemory } from "../focus/focus-memory.ts";
import type { IconSource } from "../icon-source.ts";
import { parseDockLayout } from "./dock-layout.ts";
import { neighbour } from "./neighbour.ts";

// What a panel can do with its place in the grid.
export type PanelFrame = {
	// Shows an element in the panel's header in place of its icon and title.
	header: Attachment<HTMLElement>;
	// `closeActive` asks first; true means the panel closed something of its
	// own and stays. Returns what takes the handler off again.
	handleClose(handler: () => boolean): () => void;
};

// What the grid passes a panel's component: the kind it renders, so one
// component can serve several kinds, such as every plugin panel, and its
// frame.
export type PanelProps = { kind: string; frame: PanelFrame };

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
	// By panel id: where a panel's own header goes, the panels that filled
	// theirs, and what closes something inside one.
	const headerHosts = new Map<string, HTMLElement>();
	const ownHeaders = new SvelteSet<string>();
	const closeHandlers = new Map<string, () => boolean>();
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
	// By kind: how wide its panel was when it closed alone in its group, so
	// it opens again at that width.
	const widths = new Map<string, number>();

	const headerHost = (panelId: string) => {
		let host = headerHosts.get(panelId);
		if (host === undefined) {
			host = document.createElement("div");
			host.className = "h-full min-w-0";
			headerHosts.set(panelId, host);
		}
		return host;
	};

	const frame = (panelId: string): PanelFrame => ({
		header: (node) =>
			untrack(() => {
				const host = headerHost(panelId);
				host.append(node);
				ownHeaders.add(panelId);
				return () => {
					node.remove();
					// When the grid rebuilds, a successor may have filled it.
					if (host.childElementCount === 0) ownHeaders.delete(panelId);
				};
			}),
		handleClose(handler) {
			closeHandlers.set(panelId, handler);
			return () => {
				if (closeHandlers.get(panelId) === handler) {
					closeHandlers.delete(panelId);
				}
			};
		},
	});

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
		placement: Pick<AddPanelOptions, "position" | "initialWidth"> = {},
	) => {
		dock.addPanel({
			id: kind,
			component: kind,
			title: kinds.get(kind)?.title ?? kind,
			...placement,
		});
	};

	// Opens the kind's panel at the right edge of the grid, spanning its
	// height, as wide as it was when it closed; the other panels give up
	// room in proportion to their widths (docs/decisions/0033).
	const addAtEdge = (dock: DockviewApi, kind: string) => {
		const width = widths.get(kind);
		add(dock, kind, {
			position: { direction: "right" },
			...(width === undefined ? {} : { initialWidth: width }),
		});
	};

	// Marks where a kind's panel is, its group and its tab, with one of the
	// locating classes in dock.css; nothing when it is not open.
	const mark = (kind: string, className: "yaa-peek" | "yaa-flash") => {
		const panel = api?.getPanel(kind);
		if (panel === undefined) return [];
		const tab = panel.group.element.querySelector(
			`.dv-tab[data-tab-panel-id="${CSS.escape(kind)}"]`,
		);
		const marked = [panel.group.element, ...(tab ? [tab] : [])];
		for (const element of marked) element.classList.add(className);
		return marked;
	};
	let peeked: readonly Element[] = [];

	const close = (panel: IDockviewPanel) => {
		if (panel.group.panels.length === 1) {
			widths.set(panel.id, panel.group.api.width);
		}
		panel.api.close();
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
					position: {
						referencePanel: beside.kind,
						direction: beside.direction,
					},
				},
			);
		}
	};

	// The root of the panel's content, which takes focus for the panel.
	const content = (panel: IDockviewPanel | undefined) => {
		const slot = slots.find(
			(slot) => slot.part === "content" && slot.panelId === panel?.id,
		);
		const root = slot?.element.firstElementChild;
		return root instanceof HTMLElement ? root : undefined;
	};

	// Makes the panel the active one and moves keyboard focus into it, out of
	// whatever had it, such as an input in another panel.
	const activate = (panel: IDockviewPanel | undefined) => {
		if (panel === undefined) return;
		panel.api.setActive();
		const root = content(panel);
		if (root !== undefined) memory.enter(root);
	};

	// Opening or closing a panel moves focus only when it was in the grid:
	// toggling from the panel bar or the palette leaves it where it was.
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
				theme: {
					...theme,
					gap: Number.parseFloat(
						getComputedStyle(element).getPropertyValue("--spacing-panel-gap"),
					),
				},
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
		frame,
		headerHost,
		hasOwnHeader(panelId: string) {
			return ownHeaders.has(panelId);
		},
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
		// Moves focus from a text field in the active panel onto the panel.
		leaveField() {
			const root = content(api?.activePanel);
			if (root !== undefined) memory.leave(root);
		},
		// Whether the active panel has a text field to go back to.
		hasField() {
			const root = content(api?.activePanel);
			return root !== undefined && memory.hasField(root);
		},
		// Focuses the active panel's text field, the one it had last.
		editField() {
			const root = content(api?.activePanel);
			if (root !== undefined) memory.edit(root);
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
		// Closes the focused tab and focuses the panel that takes its place,
		// unless that panel closed something of its own instead.
		closeActive() {
			if (api === undefined) return;
			const active = api.activePanel;
			if (active !== undefined && closeHandlers.get(active.id)?.()) return;
			if (active !== undefined) close(active);
			activate(api.activePanel);
		},
		reset() {
			if (api === undefined) return;
			api.clear();
			latest = undefined;
			restore(api);
		},
		close(panelId: string) {
			const panel = api?.getPanel(panelId);
			if (panel !== undefined) close(panel);
		},
		// Brings the kind's panel into view, opening it at the right edge of the
		// grid when it is not there. With `takeOver` it becomes the active panel,
		// for focus to move into; without, the active one stays, unless the two
		// share a group.
		show(kind: string, takeOver: boolean) {
			if (api === undefined) return;
			const active = api.activePanel;
			if (api.getPanel(kind) === undefined) addAtEdge(api, kind);
			const panel = api.getPanel(kind);
			panel?.api.setActive();
			if (!takeOver && active && active.group !== panel?.group) {
				active.api.setActive();
			}
		},
		// Closes the kind's panel, or opens it at the right edge of the grid.
		toggle(kind: string) {
			if (api === undefined) return;
			const hadFocus = root?.contains(document.activeElement) === true;
			const panel = api.getPanel(kind);
			if (panel !== undefined) {
				// Closing a panel that is not the active one would make whichever
				// group dockview picks active; keep the one that was.
				const active = api.activePanel;
				close(panel);
				settle(active === panel ? api.activePanel : active, hadFocus);
				return;
			}
			addAtEdge(api, kind);
			// The new panel's content renders on the next tick; dockview may
			// have moved the focused element out of the page meanwhile.
			void tick().then(() => settle(api?.getPanel(kind), hadFocus));
			for (const element of mark(kind, "yaa-flash")) {
				// Animations inside the panel end here too.
				const done = (event: Event) => {
					if (event.target !== element) return;
					element.classList.remove("yaa-flash");
					element.removeEventListener("animationend", done);
				};
				element.addEventListener("animationend", done);
			}
		},
		// Shows where the kind's panel is while its toggle is hovered or
		// focused; undefined takes the mark off.
		peek(kind: string | undefined) {
			for (const element of peeked) element.classList.remove("yaa-peek");
			peeked = kind === undefined ? [] : mark(kind, "yaa-peek");
		},
	};
};

export type DockController = ReturnType<typeof createDock>;
