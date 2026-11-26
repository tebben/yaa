import { coreProtocol } from "@yaa/contracts/core-protocol";
import type { KeybindingsState } from "@yaa/contracts/keybindings";
import { errorData, type Logger } from "@yaa/contracts/log";
import { createServer, type Server } from "@yaa/contracts/server";
import type { SettingsState } from "@yaa/contracts/settings";
import type { AgentSessions } from "./agents/agent-sessions.ts";
import type { PluginManager } from "./plugins/plugins.ts";
import type { SettingsFile } from "./settings/watch-settings-file.ts";
import type { LayoutStore } from "./storage/layout-store.ts";

// The only layout scope until projects arrive in M2.
const APP_LAYOUT = "app";

export type CoreServerOptions = {
	log: Logger;
	settings: SettingsFile<SettingsState>;
	keybindings: SettingsFile<KeybindingsState>;
	layouts: LayoutStore;
	plugins: PluginManager;
	agents: AgentSessions;
};

export const createCoreServer = ({
	log,
	settings,
	keybindings,
	layouts,
	plugins,
	agents,
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
			"plugins.list": () => ({ plugins: plugins.plugins }),
			"plugins.runCommand": async ({ command }) => {
				await plugins.runCommand(command);
				return {};
			},
			"agent.start": async () => ({ sessionId: await agents.start() }),
			"agent.sessions": () => ({ sessions: agents.list() }),
			"agent.prompt": ({ sessionId, text }) => {
				agents.prompt(sessionId, text);
				return {};
			},
			"agent.cancel": ({ sessionId }) => {
				agents.cancel(sessionId);
				return {};
			},
			"agent.answerPermission": ({ sessionId, requestId, optionId }) => {
				agents.answerPermission(sessionId, requestId, optionId);
				return {};
			},
			"agent.answerQuestion": ({ sessionId, requestId, answer }) => {
				agents.answerQuestion(sessionId, requestId, answer);
				return {};
			},
		},
		{ onError: (error) => log.error("protocol error", errorData(error)) },
	);
	settings.onChange((state) => server.emit("settings.changed", state));
	keybindings.onChange((state) => server.emit("keybindings.changed", state));
	return server;
};
