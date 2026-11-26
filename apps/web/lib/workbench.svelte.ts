import type { Context } from "@yaa/commands/when";
import { tick } from "svelte";
import { createAgentChat } from "./agent/index.ts";
import { appCommands, panelCommands } from "./app-commands.ts";
import { createCommands, defaultKeybindings } from "./commands/index.ts";
import type { CoreConnection } from "./core-connection.ts";
import { createRegions } from "./focus/index.ts";
import { createLayouts } from "./layout.svelte.ts";
import { createPalette } from "./palette/index.ts";
import { panelKinds } from "./panels/index.ts";
import { createPlugins } from "./plugins/index.ts";
import {
	createProjects,
	createWorktrees,
	projectCommands,
} from "./projects/index.ts";
import { createTerminalLinks } from "./terminals/index.ts";

// Keys typed here are text, so bindings such as shift+h leave them alone.
const isTextEntry = (element: Element | null) =>
	element instanceof HTMLInputElement ||
	element instanceof HTMLTextAreaElement ||
	(element instanceof HTMLElement &&
		(element.isContentEditable ||
			// An editor that takes text through the EditContext API.
			("editContext" in element && Boolean(element.editContext))));

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The app's composition root: the plugins, the agent chat, the projects
// and their worktrees, a dock grid per worktree, the left menu, focus across the shell's regions, the
// commands with their keys, and the palette.
export const createWorkbench = (core: CoreConnection) => {
	const { client } = core;
	// The last failure the footer shows.
	let failure = $state<string>();
	const report = (message: string) => {
		failure = message;
	};
	const unreachable = (reason: unknown) =>
		report(`Core unreachable: ${describe(reason)}`);

	const plugins = createPlugins({
		client,
		terminals: createTerminalLinks(core),
		report,
		// Panels render and commands run only after `projects` exists.
		worktree: (id) =>
			projects.projects
				.flatMap(({ worktrees }) => worktrees)
				.find((worktree) => worktree.id === id),
		openWorktree: () => projects.worktree?.id,
		// Docks and the palette come later; plugins reach for them only once a
		// panel or command runs.
		dock: (id) => layouts.docks.get(id),
		pick: (source) => palette.pick(source),
	});
	const agentChat = createAgentChat({
		client,
		report,
		providers: plugins.manifests.then((manifests) =>
			manifests.flatMap(({ contributes }) => contributes.providers),
		),
	});
	// The app's kinds in rail order, then the plugins'; a plugin's kind with
	// an app kind's id replaces that placeholder where it stands.
	const kinds = plugins
		.kinds()
		.then((contributed) => new Map([...panelKinds, ...contributed]));
	const layouts = createLayouts({ client, kinds, fail: unreachable });
	const projects = createProjects({
		client,
		report,
		opening: layouts.open,
		listed: layouts.keep,
	});
	// The open worktree's dock; an overview has none, and the dock's keys do
	// nothing there.
	const dock = () => {
		const { worktree } = projects;
		return worktree && layouts.docks.get(worktree.id);
	};
	let menuOpen = $state(true);
	const regions = createRegions({ dock, menuOpen: () => menuOpen });

	const context = (): Context => ({
		"panel.kind": dock()?.activeKind,
		"project.selected": projects.selected !== undefined,
		"worktree.selected": (projects.worktree?.index ?? 0) > 0,
		"worktree.done":
			projects.worktree !== undefined &&
			projects.stateOf(projects.worktree.id) === "done",
		"focus.region": regions.current(),
		"focus.list": regions.list(),
		"focus.highlight": regions.highlighted,
		inputFocus: isTextEntry(document.activeElement),
		"palette.open": palette.open,
	});
	const commands = createCommands({ client, context });
	const palette = createPalette({
		commands: () => commands.listed(context()),
		keysFor: commands.keysFor,
		run: commands.run,
	});
	const worktrees = createWorktrees({ client, projects, palette, report });
	commands.register({
		commands: appCommands({
			dock,
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
	commands.register({
		commands: projectCommands({
			projects,
			worktrees,
			showMenu: () => {
				menuOpen = true;
				return tick();
			},
			highlight: regions.highlight,
		}),
		keybindings: [],
	});
	kinds.then((all) => {
		commands.register({
			commands: panelCommands(all, dock),
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
		layouts,
		get dock() {
			return dock();
		},
		projects,
		worktrees,
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
