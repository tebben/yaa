import { coreProtocol } from "@yaa/contracts/core-protocol";
import type { KeybindingsState } from "@yaa/contracts/keybindings";
import { createServer, type Server } from "@yaa/contracts/server";
import type { SettingsState } from "@yaa/contracts/settings";
import { errorData, type Logger } from "./log/logger.ts";
import type { SettingsFile } from "./settings/watch-settings-file.ts";

export type CoreServerOptions = {
	log: Logger;
	settings: SettingsFile<SettingsState>;
	keybindings: SettingsFile<KeybindingsState>;
};

export const createCoreServer = ({
	log,
	settings,
	keybindings,
}: CoreServerOptions): Server<typeof coreProtocol> => {
	const startedAt = Date.now();
	const server = createServer(
		coreProtocol,
		{
			"core.info": () => ({
				electron: process.versions.electron,
				node: process.versions.node,
				startedAt,
			}),
			"settings.get": () => settings.current(),
			"keybindings.get": () => keybindings.current(),
		},
		{ onError: (error) => log.error("protocol error", errorData(error)) },
	);
	settings.onChange((state) => server.emit("settings.changed", state));
	keybindings.onChange((state) => server.emit("keybindings.changed", state));
	return server;
};
