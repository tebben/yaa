import type { DockController, DockDirection } from "@yaa/ui/dock";
import type { Attachment } from "svelte/attachments";

// The parts of the window focus moves between: the shell's fixed regions
// and the dock grid (docs/spec/01-ui-layout-theming.md).
export type RegionName = "menu" | "header" | "dock" | "footer" | "rail";
export type Orientation = "vertical" | "horizontal";

type Region = {
	element: HTMLElement;
	orientation: Orientation;
	// The item that had focus last, so coming back lands on it.
	last: HTMLElement | undefined;
};

// Which region lies in each direction, after the grid in App.svelte: the
// menu runs full height on the left, the rail on the right, the header and
// footer between them above and below the dock.
const neighbours: Record<
	RegionName,
	Partial<Record<DockDirection, RegionName>>
> = {
	menu: { right: "dock" },
	header: { left: "menu", right: "rail", down: "dock" },
	dock: { left: "menu", right: "rail", up: "header", down: "footer" },
	footer: { left: "menu", right: "rail", up: "dock" },
	rail: { left: "dock" },
};

const FOCUSABLE =
	'button:not(:disabled), a[href], input, [tabindex]:not([tabindex="-1"])';

type RegionsOptions = {
	dock(): DockController | undefined;
	// The left menu can be hidden; focus skips it then.
	menuOpen(): boolean;
};

export const createRegions = ({ dock, menuOpen }: RegionsOptions) => {
	// Read on key presses only, never by markup, so it need not be reactive.
	const regions = new Map<RegionName, Region>();

	const items = (region: Region) => [
		...region.element.querySelectorAll<HTMLElement>(FOCUSABLE),
	];

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
		const last = region.last?.isConnected ? region.last : undefined;
		(last ?? items(region)[0] ?? region.element).focus();
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
				const region: Region = { element, orientation, last: undefined };
				const remember = (event: FocusEvent) => {
					if (event.target instanceof HTMLElement) region.last = event.target;
				};
				element.tabIndex = -1;
				element.addEventListener("focusin", remember);
				regions.set(name, region);
				return () => {
					element.removeEventListener("focusin", remember);
					regions.delete(name);
				};
			},
		current,
		// The orientation of the list focus is in, for `focus.list`.
		list(): Orientation | undefined {
			return regions.get(current())?.orientation;
		},
		enter,
		// Moves to the panel or region in that direction, if there is one.
		move(direction: DockDirection) {
			const from = current();
			if (from === "dock" && dock()?.focus(direction)) return;
			const to = neighbours[from][direction];
			if (to === "menu" && !menuOpen()) return;
			if (to !== undefined) enter(to);
		},
		// The next or previous item of the focused region, wrapping around.
		step(step: 1 | -1) {
			const region = regions.get(current());
			if (region === undefined) return;
			const list = items(region);
			const active = document.activeElement;
			const index = list.findIndex((item) => item === active);
			// From the region itself, down goes to the first item, up to the last.
			const next =
				index < 0 ? (step > 0 ? 0 : -1) : (index + step) % list.length;
			list.at(next)?.focus();
		},
	};
};

export type RegionsController = ReturnType<typeof createRegions>;
