import { pluginFileUrl } from "@yaa/contracts/app-urls";
import type { Keybinding } from "@yaa/contracts/keybindings";
import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import type { Worktree } from "@yaa/contracts/projects";
import type { PanelKind } from "@yaa/ui/dock";
import type { Command } from "../commands/index.ts";
import type { CoreClient } from "../core-connection.ts";
import PluginPanel from "./PluginPanel.svelte";
import { createPanelCommands } from "./panel-commands.ts";
import { createPanelContext } from "./panel-context.ts";
import type { PluginPanels } from "./plugin-panels.ts";
import { loadPluginUi, type PluginUiModule } from "./plugin-ui.ts";

type PluginsOptions = {
	client: CoreClient;
	// Shows a failure the user should see, such as a command that failed.
	report(message: string): void;
	// A listed worktree, by id.
	worktree(id: string): Worktree | undefined;
	// The worktree whose grid is open, if one is.
	openWorktree(): string | undefined;
};

const message = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The plugins core loaded, as the renderer uses them: their panel kinds,
// their commands and keys, and their UI modules, each loaded when one of
// its panels first renders (docs/spec/03-plugins.md).
export const createPlugins = ({
	client,
	report,
	worktree,
	openWorktree,
}: PluginsOptions) => {
	const panelCommands = createPanelCommands();
	const manifests = client
		.request("plugins.list", {})
		.then(({ plugins }) => plugins);
	// Which plugin contributes each panel; filled once core has answered,
	// before any panel of theirs can render.
	const owners = new Map<string, PluginManifest>();
	manifests.then(
		(plugins) => {
			for (const plugin of plugins) {
				for (const { id } of plugin.contributes.panels) owners.set(id, plugin);
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

	const panels: PluginPanels = {
		mount(kind, id) {
			const plugin = owners.get(kind);
			if (plugin === undefined) {
				throw new Error(`No plugin contributes the panel ${kind}`);
			}
			const found = worktree(id);
			if (found === undefined) throw new Error(`No worktree ${id}`);
			const { context, dispose } = createPanelContext({
				client,
				commands: panelCommands,
				plugin: plugin.id,
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
				commands: contributes.commands.map(({ panel, ...command }) => {
					if (panel !== undefined) {
						const handler = () =>
							panelCommands.find(openWorktree(), command.id);
						return {
							...command,
							enabled: () => handler() !== undefined,
							run: () => handler()?.(),
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
