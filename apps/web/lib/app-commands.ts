import type { DockController, DockDirection, PanelKind } from "@yaa/ui/dock";
import type { Command } from "./commands/index.ts";
import type { PaletteController } from "./palette/index.ts";

type AppCommandsOptions = {
	// Undefined until core has returned the saved layout.
	dock(): DockController | undefined;
	kinds: ReadonlyMap<string, PanelKind>;
	palette: PaletteController;
	toggleMenu(): void;
};

const directions: readonly [DockDirection, string, string][] = [
	["left", "Left", "left"],
	["right", "Right", "right"],
	["up", "Up", "above"],
	["down", "Down", "below"],
];

// The shell's own commands. Plugins add theirs from M1 step 7.
export const appCommands = ({
	dock,
	kinds,
	palette,
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
	...directions.map(([direction, suffix, label]) => ({
		id: `panel.focus${suffix}`,
		title: `Focus panel ${label}`,
		category: "Panel",
		run: () => dock()?.focus(direction),
	})),
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
	...[...kinds].map(([kind, { title }]) => ({
		id: `panel.toggle.${kind}`,
		title: `Toggle ${title} panel`,
		category: "Panel",
		run: () => dock()?.toggle(kind),
	})),
	{
		id: "layout.reset",
		title: "Reset layout",
		category: "Layout",
		run: () => dock()?.reset(),
	},
];
