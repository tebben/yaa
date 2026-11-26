import type { DockController, DockDirection, PanelKind } from "@yaa/ui/dock";
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
	{ id: "palette.close", when: "palette.open", run: palette.hide },
	{ id: "palette.next", when: "palette.open", run: palette.next },
	{ id: "palette.previous", when: "palette.open", run: palette.previous },
	{ id: "palette.run", when: "palette.open", run: palette.runSelected },
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
	{ id: "list.next", when: "focus.list", run: () => regions.step(1) },
	{ id: "list.previous", when: "focus.list", run: () => regions.step(-1) },
	{
		id: "tab.previous",
		title: "Previous tab",
		category: "Panel",
		run: () => dock()?.cycleTab(-1),
	},
	{
		id: "tab.next",
		title: "Next tab",
		category: "Panel",
		run: () => dock()?.cycleTab(1),
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
