// What a plugin's UI module exports (docs/spec/03-plugins.md). Components
// run on the app's Svelte runtime and use @yaa/ui; build them with the yaa
// plugin build (docs/decisions/0015-plugin-ui-loading.md).
import type { Client } from "@yaa/contracts/client";
import type { Worktree } from "@yaa/contracts/projects";
import type { Disposable, ProtocolDefinition } from "@yaa/contracts/protocol";
import type { Component } from "svelte";

// The plugin's backend, as one of its panels calls it.
export type PluginBackendClient<P extends ProtocolDefinition> = Pick<
	Client<P>,
	"request" | "subscribe"
> & {
	// The backend started over, so it has forgotten what it held.
	onRestart(listener: () => void): Disposable;
};

// What one panel gets. Everything registered through it is disposed when the
// panel closes.
export type PanelContext = {
	// The worktree whose grid the panel is in.
	readonly worktree: Worktree;
	backend<P extends ProtocolDefinition>(protocol: P): PluginBackendClient<P>;
	readonly commands: {
		// Runs `handler` for a command the manifest contributes to this panel,
		// while the panel's worktree is the open one.
		register(command: string, handler: () => void): Disposable;
	};
};

export type PanelProps = { panel: PanelContext };

export type PluginUi = {
	// One component per panel the manifest contributes, keyed by panel id.
	panels: Record<string, Component<PanelProps>>;
};
