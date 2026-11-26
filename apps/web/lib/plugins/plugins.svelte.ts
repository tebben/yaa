import { pluginFileUrl } from "@yaa/contracts/app-urls";
import type { Keybinding } from "@yaa/contracts/keybindings";
import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import type { Worktree } from "@yaa/contracts/projects";
import type { OpenFile, PickSource } from "@yaa/plugin-api/ui";
import type { DockController, PanelKind } from "@yaa/ui/dock";
import type { Command } from "../commands/index.ts";
import type { CoreClient } from "../core-connection.ts";
import type { TerminalLinks } from "../terminals/index.ts";
import PluginPanel from "./PluginPanel.svelte";
import { createPanelContext } from "./panel-context.ts";
import { createPanelHandlers } from "./panel-handlers.ts";
import type { PluginPanels } from "./plugin-panels.ts";
import { loadPluginUi, type PluginUiModule } from "./plugin-ui.ts";

type PluginsOptions = {
	client: CoreClient;
	terminals: TerminalLinks;
	// Shows a failure the user should see, such as a command that failed.
	report(message: string): void;
	// A listed worktree, by id.
	worktree(id: string): Worktree | undefined;
	// The worktree whose grid is open, if one is.
	openWorktree(): string | undefined;
	// A worktree's dock, once it is there.
	dock(worktree: string): DockController | undefined;
	// Opens the palette on a plugin's list.
	pick(source: PickSource): void;
};

const message = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The plugins core loaded, as the renderer uses them: their panel kinds,
// their commands and keys, and their UI modules, each loaded when one of
// its panels first renders (docs/spec/03-plugins.md).
export const createPlugins = ({
	client,
	terminals,
	report,
	worktree,
	openWorktree,
	dock,
	pick,
}: PluginsOptions) => {
	const panelCommands = createPanelHandlers<void>();
	const panelFiles = createPanelHandlers<OpenFile>();
	// The panel kind that opens files: the first a plugin declares.
	let opener: string | undefined;
	const manifests = client
		.request("plugins.list", {})
		.then(({ plugins }) => plugins);
	const providers = manifests.then((plugins) =>
		plugins.flatMap(({ contributes }) => contributes.providers),
	);
	// A panel that asks for them reports a failure.
	providers.catch(() => undefined);
	// Which plugin contributes each panel; filled once core has answered,
	// before any panel of theirs can render.
	const owners = new Map<string, PluginManifest>();
	manifests.then(
		(plugins) => {
			for (const plugin of plugins) {
				for (const { id, opensFiles } of plugin.contributes.panels) {
					owners.set(id, plugin);
					if (opensFiles) opener ??= id;
				}
			}
		},
		// `kinds` and the contributions report an unreachable core.
		() => undefined,
	);
	const modules = new Map<string, Promise<PluginUiModule>>();

	const moduleOf = (plugin: PluginManifest) => {
		let module = modules.get(plugin.id);
		if (module === undefined) {
			module = loadPluginUi(plugin);
			modules.set(plugin.id, module);
		}
		return module;
	};

	const loadPanel = async (plugin: PluginManifest, kind: string) => {
		const component = (await moduleOf(plugin)).panels[kind];
		if (component === undefined) {
			throw new Error(`Plugin ${plugin.id} exports no panel ${kind}`);
		}
		return component;
	};

	const openFile = (worktree: string, file: OpenFile) => {
		const shown = dock(worktree);
		if (opener === undefined || shown === undefined) {
			report(`Nothing can open ${file.path}`);
			return;
		}
		shown.show(opener, file.focus ?? true);
		panelFiles.deliver(worktree, opener, file);
	};

	const panels: PluginPanels = {
		mount(kind, id, frame) {
			const plugin = owners.get(kind);
			if (plugin === undefined) {
				throw new Error(`No plugin contributes the panel ${kind}`);
			}
			const found = worktree(id);
			if (found === undefined) throw new Error(`No worktree ${id}`);
			const { context, dispose } = createPanelContext({
				client,
				terminals,
				commands: panelCommands,
				files: panelFiles,
				openFile: (file) => openFile(found.id, file),
				pick: (source) => {
					if (openWorktree() === found.id) pick(source);
				},
				frame,
				providers,
				plugin: plugin.id,
				kind,
				declared: new Set(
					plugin.contributes.commands.flatMap((command) =>
						command.panel === kind ? [command.id] : [],
					),
				),
				worktree: found,
			});
			return { context, dispose, component: loadPanel(plugin, kind) };
		},
	};

	return {
		manifests,
		panels,
		// The panel kinds plugins contribute, in plugin and manifest order.
		async kinds(): Promise<Map<string, PanelKind>> {
			return new Map(
				(await manifests).flatMap(({ id, contributes }) =>
					contributes.panels.map(
						(panel) =>
							[
								panel.id,
								{
									title: panel.title,
									icon: pluginFileUrl(id, panel.icon),
									component: PluginPanel,
								},
							] as const,
					),
				),
			);
		},
		// A plugin's commands, which run in the plugin host or in one of its
		// panels, and its keys.
		contributions({ contributes }: PluginManifest): {
			commands: Command[];
			keybindings: readonly Keybinding[];
		} {
			return {
				commands: contributes.commands.map(({ panel, reveal, ...command }) => {
					if (panel !== undefined) {
						// The open worktree, when the command can run there.
						const target = () => {
							const open = openWorktree();
							if (open === undefined) return undefined;
							const there = reveal
								? dock(open) !== undefined
								: panelCommands.handles(open, command.id);
							return there ? open : undefined;
						};
						return {
							...command,
							enabled: () => target() !== undefined,
							run: () => {
								const open = target();
								if (open === undefined) return;
								if (reveal) dock(open)?.show(panel, true);
								panelCommands.deliver(open, command.id);
							},
						};
					}
					return {
						...command,
						run: () => {
							client
								.request("plugins.runCommand", { command: command.id })
								.catch((error: unknown) =>
									report(
										`${command.title ?? command.id} failed: ${message(error)}`,
									),
								);
						},
					};
				}),
				keybindings: contributes.keybindings,
			};
		},
	};
};

export type PluginsController = ReturnType<typeof createPlugins>;
