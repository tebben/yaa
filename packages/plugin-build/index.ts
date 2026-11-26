// The yaa plugin build: esbuild plus the Svelte compiler, used for built-in
// plugins and, from M3, by dev mode and the agent-authoring tools
// (docs/decisions/0015-plugin-ui-loading.md).
export { buildPlugin, builtFiles, readManifest } from "./lib/build-plugin.ts";
