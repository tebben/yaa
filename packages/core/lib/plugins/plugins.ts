import { join } from "node:path";
import { errorData, type Logger, type LogRecord } from "@yaa/contracts/log";
import type { PluginEvent } from "@yaa/contracts/plugin-host-protocol";
import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import type { Port } from "@yaa/contracts/protocol";
import type { SwitchedOff } from "@yaa/contracts/providers";
import { type AgentLaunch, nodeLaunch } from "../agents/agent-launch.ts";
import { createPluginHostSupervisor } from "./plugin-host-supervisor.ts";
import { readPluginFolders } from "./read-plugin-folders.ts";
import { resolvePlugins } from "./resolve-plugins.ts";

export type PluginManagerOptions = {
	// The folder of built-in plugins, one folder per plugin.
	dir: string;
	// Whether the plugins for dev mode only are loaded.
	dev: boolean;
	log: Logger;
	// Asks main to fork a plugin host.
	requestHost(): void;
	// The host's log lines.
	write(record: LogRecord): void;
	// Serves the plugin API to a host.
	serve(port: Port): void;
	// An event a plugin's backend sends its UI.
	onEvent(event: PluginEvent): void;
	// The host went away, with everything its plugins held.
	onLost(): void;
};

// The plugin manager (docs/spec/03-plugins.md): reads the plugin folders
// once at start, and activates a plugin's backend module in the host on
// its first activation event.
export const createPluginManager = ({
	dir,
	dev,
	log,
	requestHost,
	write,
	serve,
	onEvent,
	onLost,
}: PluginManagerOptions) => {
	const { plugins: found, refused } = resolvePlugins(readPluginFolders(dir));
	const plugins = found.filter(({ devOnly }) => dev || !devOnly);
	for (const { folder, problems } of refused) {
		log.warn(`plugin ${folder} was not loaded`, { dir, problems });
	}
	log.info("plugins loaded", { dir, plugins: plugins.map(({ id }) => id) });

	const owners = new Map<string, PluginManifest>();
	for (const plugin of plugins) {
		for (const { id, panel } of plugin.contributes.commands) {
			// A panel's commands run in the renderer.
			if (panel === undefined) owners.set(id, plugin);
		}
	}
	const providers = new Map(
		plugins.flatMap((plugin) =>
			plugin.contributes.providers.map(({ id }) => [id, plugin] as const),
		),
	);
	// One activation per plugin per host, kept when it failed: a plugin whose
	// activate threw stays failed until the host restarts.
	const activations = new Map<string, Promise<void>>();

	const host = createPluginHostSupervisor({
		requestHost,
		write,
		serve,
		onEvent,
		log,
		// Everything the host had activated went with it.
		onLost: () => {
			activations.clear();
			onLost();
			activateStartup();
		},
	});

	const activate = (plugin: PluginManifest): Promise<void> => {
		const { main } = plugin;
		if (main === undefined) return Promise.resolve();
		let activation = activations.get(plugin.id);
		if (activation === undefined) {
			activation = (async () => {
				await host.client().request("plugin.activate", {
					id: plugin.id,
					main: join(dir, plugin.id, main),
					commands: plugin.contributes.commands.flatMap(({ id, panel }) =>
						panel === undefined ? [id] : [],
					),
					providers: plugin.contributes.providers.map(({ id }) => id),
				});
				log.info(`plugin ${plugin.id} activated`);
			})();
			activations.set(plugin.id, activation);
		}
		return activation;
	};

	const activateStartup = () => {
		for (const plugin of plugins) {
			if (!plugin.activationEvents.includes("onStartup")) continue;
			activate(plugin).catch((error: unknown) =>
				log.error(`plugin ${plugin.id} failed to activate`, errorData(error)),
			);
		}
	};

	// The plugin that contributes a provider, activated.
	const providing = async (provider: string) => {
		const owner = providers.get(provider);
		if (owner === undefined) {
			throw new Error(`No plugin contributes the provider ${provider}`);
		}
		await activate(owner);
		return owner;
	};

	activateStartup();

	return {
		plugins,
		attachHost: host.attach,
		// A request from a plugin's UI to its backend.
		async call(id: string, method: string, params: unknown) {
			const plugin = plugins.find((candidate) => candidate.id === id);
			if (plugin?.main === undefined) {
				throw new Error(`No plugin ${id} has a backend`);
			}
			await activate(plugin);
			return host.client().request("plugin.call", { id, method, params });
		},
		async providerStatus(provider: string) {
			await providing(provider);
			return host.client().request("provider.status", { provider });
		},
		// How the provider's agent takes the worktree's permission mode, if it
		// does.
		permissionModes(provider: string) {
			return providers
				.get(provider)
				?.contributes.providers.find(({ id }) => id === provider)
				?.permissionModes;
		},
		// The MCP servers and skills the provider's agent would load in the
		// folder.
		async discover(
			provider: string,
			folders: { cwd: string; repository: string },
		) {
			await providing(provider);
			return host
				.client()
				.request("provider.discover", { provider, ...folders });
		},
		// The command that starts a provider's agent in the folder, with what
		// yaa switches off.
		async launchAgent(
			provider: string,
			cwd: string,
			off: SwitchedOff,
		): Promise<AgentLaunch> {
			const owner = await providing(provider);
			const spawn = await host
				.client()
				.request("provider.spawn", { provider, cwd, off });
			const { args = [], env = {}, sessionMeta } = spawn;
			const meta = sessionMeta === undefined ? {} : { sessionMeta };
			if (spawn.run === "command") {
				return { command: spawn.command, args, env, ...meta };
			}
			if (owner.agent === undefined) {
				throw new Error(`Plugin ${owner.id} declares no agent module`);
			}
			return {
				...nodeLaunch(join(dir, owner.id, owner.agent), args, env),
				...meta,
			};
		},
		async runCommand(command: string) {
			const owner = owners.get(command);
			if (owner === undefined) {
				throw new Error(`No plugin contributes the command ${command}`);
			}
			await activate(owner);
			await host.client().request("command.run", { command });
		},
	};
};

export type PluginManager = ReturnType<typeof createPluginManager>;
