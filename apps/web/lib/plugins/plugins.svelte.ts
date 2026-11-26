import { pluginFileUrl } from "@yaa/contracts/app-urls";
import type { Keybinding } from "@yaa/contracts/keybindings";
import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import type { PanelKind } from "@yaa/ui/dock";
import type { Component } from "svelte";
import type { Command } from "../commands/index.ts";
import type { CoreClient } from "../core-connection.ts";
import PluginPanel from "./PluginPanel.svelte";
import type { PluginPanels } from "./plugin-panels.ts";
import { loadPluginUi, type PluginUiModule } from "./plugin-ui.ts";

type PluginsOptions = {
	client: CoreClient;
	// Shows a failure the user should see, such as a command that failed.
	report(message: string): void;
};

const message = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The plugins core loaded, as the renderer uses them: their panel kinds,
// their commands and keys, and their UI modules, each loaded when one of
// its panels first renders (docs/spec/03-plugins.md).
export const createPlugins = ({ client, report }: PluginsOptions) => {
	const manifests = client
		.request("plugins.list", {})
		.then(({ plugins }) => plugins);
	const owners = manifests.then(
		(plugins) =>
			new Map(
				plugins.flatMap((plugin) =>
					plugin.contributes.panels.map(({ id }) => [id, plugin] as const),
				),
			),
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

	const panels: PluginPanels = {
		async load(kind) {
			const plugin = (await owners).get(kind);
			if (plugin === undefined) {
				throw new Error(`No plugin contributes the panel ${kind}`);
			}
			const component: Component | undefined = (await moduleOf(plugin)).panels[
				kind
			];
			if (component === undefined) {
				throw new Error(`Plugin ${plugin.id} exports no panel ${kind}`);
			}
			return component;
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
		// A plugin's commands, which run in the plugin host, and its keys.
		contributions({ contributes }: PluginManifest): {
			commands: Command[];
			keybindings: readonly Keybinding[];
		} {
			return {
				commands: contributes.commands.map((command) => ({
					...command,
					run: () => {
						client
							.request("plugins.runCommand", { command: command.id })
							.catch((error: unknown) =>
								report(`${command.title} failed: ${message(error)}`),
							);
					},
				})),
				keybindings: contributes.keybindings,
			};
		},
	};
};

export type PluginsController = ReturnType<typeof createPlugins>;
