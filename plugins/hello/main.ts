// The hello plugin's backend: the example of a plugin with a command, a
// key and a panel, and the first built-in plugin.
import type { PluginBackend } from "@yaa/plugin-api";

export const activate: PluginBackend["activate"] = ({ commands, log }) => {
	commands.register("hello.greet", () => {
		log.info("Hello from the hello plugin");
	});
};
