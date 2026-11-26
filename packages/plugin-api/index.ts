// The API a plugin's backend module gets (docs/spec/03-plugins.md). It is
// unstable, 0.x, until the freeze in M6
// (docs/decisions/0011-plugin-api-unstable-until-m6.md): when a plugin
// needs something it lacks, change it here, in contracts and in core.
import type { Logger } from "@yaa/contracts/log";
import type { Worktree } from "@yaa/contracts/projects";
import type {
	Disposable,
	EventName,
	PayloadIn,
	ProtocolDefinition,
} from "@yaa/contracts/protocol";
import type { Handlers } from "@yaa/contracts/server";
import type {
	DirEntry,
	GitChange,
	GitFiles,
} from "@yaa/contracts/worktree-files";

export type { Disposable };

export type CommandHandler = () => void | Promise<void>;

// What `serve` returns: the way to send the plugin's UI an event its
// protocol declares. Disposing stops serving.
export type PluginServer<P extends ProtocolDefinition> = Disposable & {
	emit<E extends EventName<P>>(event: E, payload: PayloadIn<P, E>): void;
};

export type PluginContext = {
	// The plugin's id from its manifest.
	readonly id: string;
	readonly commands: {
		// Runs `handler` for a command the manifest contributes to the backend.
		// A command without a handler fails when it runs.
		register(command: string, handler: CommandHandler): Disposable;
	};
	// Answers the requests of the plugin's own UI, in a protocol the plugin
	// defines with `defineProtocol`. One per plugin.
	serve<P extends ProtocolDefinition>(
		protocol: P,
		handlers: Handlers<P>,
	): PluginServer<P>;
	readonly worktrees: {
		get(id: string): Promise<Worktree>;
	};
	// Git as it sees a worktree, by the worktree's id.
	readonly git: {
		files(worktree: string): Promise<GitFiles>;
		// The ignored files and folders; a folder ends with `/` and stands for
		// everything in it.
		ignored(worktree: string): Promise<string[]>;
		changes(worktree: string): Promise<GitChange[]>;
	};
	// A worktree's folder. Paths are relative to it, with `/`; one that
	// leaves the folder or touches `.git` is refused.
	readonly files: {
		// The folder's entries; "" is the worktree's folder itself.
		readDir(worktree: string, path: string): Promise<DirEntry[]>;
		// A new empty file, with the folders its path needs.
		create(worktree: string, path: string): Promise<void>;
		// Moves a file or folder; never over something that exists.
		rename(worktree: string, from: string, to: string): Promise<void>;
		// Removes a file, or a folder with everything in it.
		remove(worktree: string, path: string): Promise<void>;
		// Calls `listener` after files change in the worktree, ignored folders
		// aside, or after git's view of it does, as on staging.
		watch(worktree: string, listener: () => void): Promise<Disposable>;
	};
	// Lines go to the app's log file, tagged with the plugin's id.
	readonly log: Logger;
};

// What a backend module exports. The host calls `activate` once, on the
// plugin's first activation event.
export type PluginBackend = {
	activate(context: PluginContext): void | Promise<void>;
};
