import type { Context } from "@yaa/commands/when";
import { appCommands } from "./app-commands.ts";
import { createCommands, defaultKeybindings } from "./commands/index.ts";
import type { CoreClient } from "./core-connection.ts";
import { createLayout } from "./layout.svelte.ts";
import { createPalette } from "./palette/index.ts";
import { panelKinds } from "./panels/index.ts";

// Keys typed here are text, so bindings such as shift+h leave them alone.
const isTextEntry = (element: Element | null) =>
	element instanceof HTMLInputElement ||
	element instanceof HTMLTextAreaElement ||
	(element instanceof HTMLElement && element.isContentEditable);

// The app's composition root: the dock layout, the left menu, the commands
// with their keys, and the palette.
export const createWorkbench = (client: CoreClient) => {
	const layout = createLayout(client);
	let menuOpen = $state(true);

	const context = (): Context => ({
		"panel.kind": layout.dock?.activeKind,
		inputFocus: isTextEntry(document.activeElement),
		"palette.open": palette.open,
	});
	const commands = createCommands({
		client,
		defaults: defaultKeybindings,
		context,
	});
	const palette = createPalette({
		commands: () => commands.listed(context()),
		run: commands.run,
	});
	commands.register(
		appCommands({
			dock: () => layout.dock,
			kinds: panelKinds,
			palette,
			toggleMenu: () => {
				menuOpen = !menuOpen;
			},
		}),
	);

	return {
		layout,
		commands,
		palette,
		get menuOpen() {
			return menuOpen;
		},
	};
};

export type Workbench = ReturnType<typeof createWorkbench>;
