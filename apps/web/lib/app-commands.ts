import type { DockController, DockDirection, PanelKind } from "@yaa/ui/dock";
import { isParked, park, unpark } from "@yaa/ui/focus";
import type { Command } from "./commands/index.ts";
import type { RegionsController } from "./focus/index.ts";
import type { PaletteController } from "./palette/index.ts";

type AppCommandsOptions = {
	// Undefined until core has returned the saved layout.
	dock(): DockController | undefined;
	palette: PaletteController;
	regions: RegionsController;
	toggleMenu(): void;
};

const directions: readonly DockDirection[] = ["left", "right", "up", "down"];

// The shell's own commands. Plugins add theirs (plugins/index.ts).
export const appCommands = ({
	dock,
	palette,
	regions,
	toggleMenu,
}: AppCommandsOptions): Command[] => [
	{
		id: "palette.open",
		title: "Show all commands",
		category: "View",
		run: palette.show,
	},
	{ id: "palette.close", inPalette: true, run: palette.hide },
	{ id: "palette.next", inPalette: true, run: palette.next },
	{ id: "palette.previous", inPalette: true, run: palette.previous },
	{ id: "palette.run", inPalette: true, run: palette.runSelected },
	{
		id: "menu.toggle",
		title: "Toggle left menu",
		category: "View",
		run: toggleMenu,
	},
	...directions.map((direction) => ({
		id: `focus.${direction}`,
		title: `Focus ${direction}`,
		category: "View",
		run: () => regions.move(direction),
	})),
	// Escape stops editing a field and leaves focus on it, parked; Enter or I
	// edits it again, or the panel's or region's field when focus is not on
	// one (docs/spec/01-ui-layout-theming.md).
	{
		id: "input.leave",
		when: "textField",
		run: () => park(document.activeElement),
	},
	{
		id: "input.edit",
		title: "Edit the text field",
		category: "View",
		when: "!inputFocus",
		enabled: () => isParked(document.activeElement) || regions.hasField(),
		run: () => {
			const active = document.activeElement;
			if (isParked(active)) unpark(active);
			else regions.editField();
		},
	},
	{
		id: "focus.hideHighlight",
		when: "focus.highlight",
		run: regions.hideHighlight,
	},
	{ id: "list.next", when: "focus.list", run: () => regions.step(1) },
	{ id: "list.previous", when: "focus.list", run: () => regions.step(-1) },
	{
		id: "tab.previous",
		title: "Previous tab",
		category: "Panel",
		run: () => {
			regions.highlight();
			dock()?.cycleTab(-1);
		},
	},
	{
		id: "tab.next",
		title: "Next tab",
		category: "Panel",
		run: () => {
			regions.highlight();
			dock()?.cycleTab(1);
		},
	},
	{
		id: "panel.narrower",
		title: "Make panel narrower",
		category: "Panel",
		run: () => dock()?.resize("width", -1),
	},
	{
		id: "panel.wider",
		title: "Make panel wider",
		category: "Panel",
		run: () => dock()?.resize("width", 1),
	},
	{
		id: "panel.shorter",
		title: "Make panel shorter",
		category: "Panel",
		run: () => dock()?.resize("height", -1),
	},
	{
		id: "panel.taller",
		title: "Make panel taller",
		category: "Panel",
		run: () => dock()?.resize("height", 1),
	},
	{
		id: "panel.close",
		title: "Close panel",
		category: "Panel",
		run: () => dock()?.closeActive(),
	},
	{
		id: "panel.fullScreen",
		title: "Toggle full-screen panel",
		category: "Panel",
		run: () => dock()?.toggleActiveFullScreen(),
	},
	{
		id: "layout.reset",
		title: "Reset layout",
		category: "Layout",
		run: () => dock()?.reset(),
	},
];

// One toggle per panel kind, once the kinds plugins contribute are known.
export const panelCommands = (
	kinds: ReadonlyMap<string, PanelKind>,
	dock: () => DockController | undefined,
): Command[] =>
	[...kinds].map(([kind, { title }]) => ({
		id: `panel.toggle.${kind}`,
		title: `Toggle ${title} panel`,
		category: "Panel",
		run: () => dock()?.toggle(kind),
	}));
