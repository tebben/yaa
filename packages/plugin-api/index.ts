// The API a plugin's backend module gets (docs/spec/03-plugins.md). It is
// unstable, 0.x, until the freeze in M6
// (docs/decisions/0011-plugin-api-unstable-until-m6.md): when a plugin
// needs something it lacks, change it here, in contracts and in core.
import type { Logger } from "@yaa/contracts/log";
import type { Disposable } from "@yaa/contracts/protocol";

export type { Disposable };

export type CommandHandler = () => void | Promise<void>;

export type PluginContext = {
	// The plugin's id from its manifest.
	readonly id: string;
	readonly commands: {
		// Runs `handler` for a command the manifest contributes. A command
		// without a handler fails when it runs.
		register(command: string, handler: CommandHandler): Disposable;
	};
	// Lines go to the app's log file, tagged with the plugin's id.
	readonly log: Logger;
};

// What a backend module exports. The host calls `activate` once, on the
// plugin's first activation event.
export type PluginBackend = {
	activate(context: PluginContext): void | Promise<void>;
};
