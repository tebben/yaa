// What a plugin's UI module exports (docs/spec/03-plugins.md). Components
// run on the app's Svelte runtime and use @yaa/ui; build them with the yaa
// plugin build (docs/decisions/0015-plugin-ui-loading.md).
import type { Component } from "svelte";

export type PluginUi = {
	// One component per panel the manifest contributes, keyed by panel id.
	panels: Record<string, Component>;
};
