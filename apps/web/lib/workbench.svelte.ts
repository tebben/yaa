import type { Context } from "@yaa/commands/when";
import { createAgentChat } from "./agent/index.ts";
import { appCommands, panelCommands } from "./app-commands.ts";
import { createCommands, defaultKeybindings } from "./commands/index.ts";
import type { CoreClient } from "./core-connection.ts";
import { createRegions } from "./focus/index.ts";
import { createLayout } from "./layout.svelte.ts";
import { createPalette } from "./palette/index.ts";
import { panelKinds } from "./panels/index.ts";
import { createPlugins } from "./plugins/index.ts";

// Keys typed here are text, so bindings such as shift+h leave them alone.
const isTextEntry = (element: Element | null) =>
	element instanceof HTMLInputElement ||
	element instanceof HTMLTextAreaElement ||
	(element instanceof HTMLElement && element.isContentEditable);

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The app's composition root: the plugins, the agent chat, the dock layout, the left menu,
// focus across the shell's regions, the commands with their keys, and the
// palette.
export const createWorkbench = (client: CoreClient) => {
	// The last failure the footer shows.
	let failure = $state<string>();
	const report = (message: string) => {
		failure = message;
	};
	const unreachable = (reason: unknown) =>
		report(`Core unreachable: ${describe(reason)}`);

	const plugins = createPlugins({ client, report });
	const agentChat = createAgentChat({ client, report });
	// The app's kinds in rail order, then the plugins'; a plugin's kind with
	// an app kind's id replaces that placeholder where it stands.
	const kinds = plugins
		.kinds()
		.then((contributed) => new Map([...panelKinds, ...contributed]));
	const layout = createLayout({ client, kinds, fail: unreachable });
	let menuOpen = $state(true);
	const regions = createRegions({
		dock: () => layout.dock,
		menuOpen: () => menuOpen,
	});

	const context = (): Context => ({
		"panel.kind": layout.dock?.activeKind,
		"focus.region": regions.current(),
		"focus.list": regions.list(),
		"focus.highlight": regions.highlighted,
		inputFocus: isTextEntry(document.activeElement),
		"palette.open": palette.open,
	});
	const commands = createCommands({ client, context });
	const palette = createPalette({
		commands: () => commands.listed(context()),
		run: commands.run,
	});
	commands.register({
		commands: appCommands({
			dock: () => layout.dock,
			palette,
			regions,
			// Hiding the menu while it has focus hands focus to the grid.
			toggleMenu: () => {
				const leaving = regions.current() === "menu";
				menuOpen = !menuOpen;
				if (leaving) regions.enter("dock");
			},
		}),
		keybindings: defaultKeybindings,
	});
	kinds.then((all) => {
		commands.register({
			commands: panelCommands(all, () => layout.dock),
			keybindings: [],
		});
	}, unreachable);
	plugins.manifests.then((manifests) => {
		// One plugin that clashes with another contributor loses its
		// commands; the rest still register.
		for (const manifest of manifests) {
			try {
				commands.register(plugins.contributions(manifest));
			} catch (error) {
				report(`Plugin ${manifest.id}: ${describe(error)}`);
			}
		}
	}, unreachable);

	return {
		layout,
		regions,
		commands,
		palette,
		plugins,
		agentChat,
		get menuOpen() {
			return menuOpen;
		},
		get failure() {
			return failure;
		},
	};
};

export type Workbench = ReturnType<typeof createWorkbench>;
