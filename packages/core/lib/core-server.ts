import { coreProtocol } from "@yaa/contracts/core-protocol";
import type { KeybindingsState } from "@yaa/contracts/keybindings";
import { createServer, type Server } from "@yaa/contracts/server";
import type { SettingsState } from "@yaa/contracts/settings";
import { errorData, type Logger } from "./log/logger.ts";
import type { SettingsFile } from "./settings/watch-settings-file.ts";
import type { LayoutStore } from "./storage/layout-store.ts";

// The only layout scope until projects arrive in M2.
const APP_LAYOUT = "app";

export type CoreServerOptions = {
	log: Logger;
	settings: SettingsFile<SettingsState>;
	keybindings: SettingsFile<KeybindingsState>;
	layouts: LayoutStore;
};

export const createCoreServer = ({
	log,
	settings,
	keybindings,
	layouts,
}: CoreServerOptions): Server<typeof coreProtocol> => {
	const server = createServer(
		coreProtocol,
		{
			"settings.get": () => settings.current(),
			"keybindings.get": () => keybindings.current(),
			"layout.get": () => ({ layout: layouts.get(APP_LAYOUT) ?? null }),
			"layout.save": ({ layout }) => {
				layouts.save(APP_LAYOUT, layout);
				return {};
			},
		},
		{ onError: (error) => log.error("protocol error", errorData(error)) },
	);
	settings.onChange((state) => server.emit("settings.changed", state));
	keybindings.onChange((state) => server.emit("keybindings.changed", state));
	return server;
};
