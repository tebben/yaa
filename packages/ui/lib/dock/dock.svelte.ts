import type { LucideIcon } from "@lucide/svelte";
import {
	createDockview,
	type DockviewApi,
	type GroupPanelPartInitParameters,
} from "dockview-core";
import { type Component, untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { parseDockLayout } from "./dock-layout.ts";

// A view the grid can show (docs/spec/01-ui-layout-theming.md). The kind's id
// is the map key; while each kind opens at most once it is the panel id too.
export type PanelKind = {
	title: string;
	icon: LucideIcon;
	component: Component;
};

type Direction = "left" | "right" | "above" | "below" | "within";

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
	let api: DockviewApi | undefined;
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
			return () => {
				changes.dispose();
				dock.dispose();
				api = undefined;
			};
		});

	return {
		get slots(): readonly DockSlot[] {
			return slots;
		},
		attach,
		isOpen(kind: string) {
			return open.has(kind);
		},
		close(panelId: string) {
			api?.getPanel(panelId)?.api.close();
		},
		// Closes the kind's panel, or opens it beside the focused group.
		toggle(kind: string) {
			if (api === undefined) return;
			const panel = api.getPanel(kind);
			if (panel !== undefined) {
				panel.api.close();
				return;
			}
			const group = api.activeGroup;
			add(api, kind, group && { referenceGroup: group, direction: "right" });
		},
	};
};

export type DockController = ReturnType<typeof createDock>;
