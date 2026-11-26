// The fake agent as a provider, in dev mode only: always there, with no
// sign-in (docs/spec/05-agents-chat.md).
import type { PluginBackend } from "@yaa/plugin-api";

export const activate: PluginBackend["activate"] = ({ providers }) => {
	providers.register("fake-agent", {
		detect: async () => ({ installed: true, version: "0.0.0" }),
		authStatus: async () => ({ state: "signed-in" }),
		spawn: async () => ({ run: "module" }),
	});
};
