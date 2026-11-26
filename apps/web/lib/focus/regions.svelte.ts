import type { DockController, DockDirection } from "@yaa/ui/dock";
import { createFocusMemory, focusableItems } from "@yaa/ui/focus";
import type { Attachment } from "svelte/attachments";

// The parts of the window focus moves between: the shell's fixed regions
// and the dock grid (docs/spec/01-ui-layout-theming.md).
export type RegionName = "menu" | "header" | "dock" | "footer";
export type Orientation = "vertical" | "horizontal";

type Region = { element: HTMLElement; orientation: Orientation };

// Which region lies in each direction, after the grid in App.svelte: the
// header, with the panel toggles at its end, runs across the top and the
// footer across the bottom; between them are the menu and the dock.
const neighbours: Record<
	RegionName,
	Partial<Record<DockDirection, RegionName>>
> = {
	menu: { right: "dock", up: "header", down: "footer" },
	header: { down: "dock" },
	dock: { left: "menu", up: "header", down: "footer" },
	footer: { up: "dock" },
};

type RegionsOptions = {
	dock(): DockController | undefined;
	// The left menu can be hidden; focus skips it then.
	menuOpen(): boolean;
};

export const createRegions = ({ dock, menuOpen }: RegionsOptions) => {
	// Read on key presses only, never by markup, so it need not be reactive.
	const regions = new Map<RegionName, Region>();
	// Coming back to a region lands on the item that had focus there last.
	const memory = createFocusMemory();
	// Whether the focus edge shows: from a keyboard move until a click or
	// Escape (docs/spec/01-ui-layout-theming.md).
	let highlighted = $state(false);

	// The region focus is in; the dock when focus is nowhere, as at start.
	const current = (): RegionName => {
		const active = document.activeElement;
		for (const [name, region] of regions) {
			if (region.element.contains(active)) return name;
		}
		return "dock";
	};

	const enter = (name: RegionName) => {
		const region = regions.get(name);
		if (region === undefined) {
			dock()?.focusActive();
			return;
		}
		memory.enter(region.element, { focusVisible: true });
	};

	return {
		// Registers a shell region. The element itself takes focus when it has
		// no items, so an empty region can still be visited.
		region:
			(
				name: Exclude<RegionName, "dock">,
				orientation: Orientation,
			): Attachment<HTMLElement> =>
			(element) => {
				element.tabIndex = -1;
				const untrack = memory.track(element);
				regions.set(name, { element, orientation });
				return () => {
					untrack();
					regions.delete(name);
				};
			},
		current,
		// The orientation of the list focus is in, for `focus.list`.
		list(): Orientation | undefined {
			return regions.get(current())?.orientation;
		},
		enter,
		get highlighted() {
			return highlighted;
		},
		// Shows the focus edge, for keys that move focus within a panel.
		highlight() {
			highlighted = true;
		},
		hideHighlight() {
			highlighted = false;
		},
		// Moves focus out of the text field it is in, onto the panel or region
		// holding it.
		leaveField() {
			const region = regions.get(current());
			if (region === undefined) dock()?.leaveField();
			else memory.leave(region.element);
		},
		// Whether the focused panel or region has a text field to edit.
		hasField() {
			const region = regions.get(current());
			if (region === undefined) return dock()?.hasField() ?? false;
			return memory.hasField(region.element);
		},
		// Focuses the text field of the focused panel or region.
		editField() {
			const region = regions.get(current());
			if (region === undefined) dock()?.editField();
			else memory.edit(region.element);
		},
		// Moves to the panel or region in that direction, if there is one.
		move(direction: DockDirection) {
			highlighted = true;
			const from = current();
			if (from === "dock" && dock()?.focus(direction)) return;
			const to = neighbours[from][direction];
			if (to === "menu" && !menuOpen()) return;
			if (to !== undefined) enter(to);
		},
		// The next or previous item of the focused region, wrapping around.
		step(step: 1 | -1) {
			highlighted = true;
			const region = regions.get(current());
			if (region === undefined) return;
			const list = focusableItems(region.element);
			const active = document.activeElement;
			const index = list.findIndex((item) => item === active);
			// From the region itself, down goes to the first item, up to the last.
			const next =
				index < 0 ? (step > 0 ? 0 : -1) : (index + step) % list.length;
			list.at(next)?.focus({ focusVisible: true });
		},
	};
};

export type RegionsController = ReturnType<typeof createRegions>;
