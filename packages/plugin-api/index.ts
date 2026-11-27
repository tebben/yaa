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
import type {
	AgentSpawn,
	AuthStatus,
	Detection,
	DiscoveredItem,
	Discovery,
	SwitchedOff,
} from "@yaa/contracts/providers";
import type { Handlers } from "@yaa/contracts/server";
import type {
	DirEntry,
	FileBytes,
	FileContent,
	FileWrite,
	GitAction,
	GitChange,
	GitFiles,
	GitSection,
	GitSource,
	RemoteImage,
} from "@yaa/contracts/worktree-files";

export type {
	AgentSpawn,
	AuthStatus,
	Detection,
	DirEntry,
	DiscoveredItem,
	Discovery,
	Disposable,
	SwitchedOff,
};

export type CommandHandler = () => void | Promise<void>;

// What `serve` returns: the way to send the plugin's UI an event its
// protocol declares. Disposing stops serving.
export type PluginServer<P extends ProtocolDefinition> = Disposable & {
	emit<E extends EventName<P>>(event: E, payload: PayloadIn<P, E>): void;
};

// A connection to one agent (docs/spec/05-agents-chat.md). It says how to
// find, sign in to and start the agent; core runs the process and speaks ACP
// to it.
export type AgentProvider = {
	// Finds the installed agent and its version.
	detect(): Promise<Detection>;
	// Asked only of an agent `detect` found.
	authStatus(): Promise<AuthStatus>;
	// How to start the agent for a session in the folder. `off` names what
	// yaa switches off, which a provider with `mcp-toggling` or
	// `skill-toggling` has the agent leave out (docs/spec/09-mcp-skills.md).
	spawn(session: { cwd: string; off: SwitchedOff }): Promise<AgentSpawn>;
	// For a provider with `discovery`: the MCP servers and skills the agent's
	// configuration names for a session in the folder. `repository` is the main
	// checkout of the repository the folder is a worktree of.
	discover?(session: { cwd: string; repository: string }): Promise<Discovery>;
};

// How a program that ran to its end ended.
export type ProgramResult = { code: number; stdout: string; stderr: string };

export type PluginContext = {
	// The plugin's id from its manifest.
	readonly id: string;
	readonly commands: {
		// Runs `handler` for a command the manifest contributes to the backend.
		// A command without a handler fails when it runs.
		register(command: string, handler: CommandHandler): Disposable;
	};
	readonly providers: {
		// Connects an agent for a provider the manifest contributes.
		register(provider: string, agent: AgentProvider): Disposable;
	};
	// The programs installed on the machine, such as an agent's CLI.
	readonly programs: {
		// The path of a program on the PATH, or undefined when there is none.
		find(name: string): Promise<string | undefined>;
		// Runs a program to its end, without input, whatever its exit code.
		// One that cannot start or takes more than 10 seconds throws.
		run(path: string, args: string[]): Promise<ProgramResult>;
	};
	// Files outside the worktrees, read only, such as an agent's own
	// configuration. Paths are absolute; a leading ~ is the home folder.
	readonly userFiles: {
		// The file's text, or undefined when there is no such file.
		read(path: string): Promise<string | undefined>;
		// The folder's entries, none when there is no such folder.
		readDir(path: string): Promise<DirEntry[]>;
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
		read(
			worktree: string,
			source: GitSource,
			path: string,
		): Promise<FileContent>;
		change(
			worktree: string,
			action: GitAction,
			section: GitSection,
			paths: readonly string[],
		): Promise<void>;
		commit(worktree: string, message: string): Promise<void>;
	};
	// A worktree's folder. Paths are relative to it, with `/`; one that
	// leaves the folder or touches `.git` is refused.
	readonly files: {
		// The folder's entries; "" is the worktree's folder itself.
		readDir(worktree: string, path: string): Promise<DirEntry[]>;
		// A file's text; one that is not there, not UTF-8 text or too large to
		// open says so.
		read(worktree: string, path: string): Promise<FileContent>;
		// A file's bytes, base64 encoded; missing and oversized files say so.
		readBytes(worktree: string, path: string): Promise<FileBytes>;
		// Fetches an HTTPS image after the user has agreed to load it.
		fetchImage(url: string): Promise<RemoteImage>;
		// Writes the text over the file at `version`, as `read` gave it, or
		// makes the file when `version` is null. A file at another version is
		// left alone and reported.
		write(
			worktree: string,
			path: string,
			text: string,
			version: string | null,
		): Promise<FileWrite>;
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
	// JSON values the plugin keeps per worktree, across restarts, until the
	// worktree is finished. State that must survive a reload goes here.
	readonly storage: {
		// Undefined when nothing is kept under the key. Check what comes back:
		// an earlier version of the plugin may have stored it.
		get(worktree: string, key: string): Promise<unknown>;
		// Undefined removes the key.
		set(worktree: string, key: string, value: unknown): Promise<void>;
	};
	// Lines go to the app's log file, tagged with the plugin's id.
	readonly log: Logger;
};

// What a backend module exports. The host calls `activate` once, on the
// plugin's first activation event.
export type PluginBackend = {
	activate(context: PluginContext): void | Promise<void>;
};
