import { coreProtocol } from "@yaa/contracts/core-protocol";
import type { KeybindingsState } from "@yaa/contracts/keybindings";
import { errorData, type Logger } from "@yaa/contracts/log";
import { createServer, type Server } from "@yaa/contracts/server";
import type { SettingsState } from "@yaa/contracts/settings";
import type { AgentSessions } from "./agents/agent-sessions.ts";
import type { PluginManager } from "./plugins/plugins.ts";
import type { Projects } from "./projects/projects.ts";
import type { Worktrees } from "./projects/worktrees.ts";
import type { SettingsFile } from "./settings/watch-settings-file.ts";
import type { LayoutStore } from "./storage/layout-store.ts";

export type CoreServerOptions = {
	log: Logger;
	settings: SettingsFile<SettingsState>;
	keybindings: SettingsFile<KeybindingsState>;
	layouts: LayoutStore;
	plugins: PluginManager;
	agents: AgentSessions;
	projects: Projects;
	worktrees: Worktrees;
	pickFolder(): Promise<string | null>;
};

export const createCoreServer = ({
	log,
	settings,
	keybindings,
	layouts,
	plugins,
	agents,
	projects,
	worktrees,
	pickFolder,
}: CoreServerOptions): Server<typeof coreProtocol> => {
	const server = createServer(
		coreProtocol,
		{
			"settings.get": () => settings.current(),
			"keybindings.get": () => keybindings.current(),
			"layout.get": ({ worktree }) => ({
				layout: layouts.get(worktree) ?? null,
			}),
			"layout.save": ({ worktree, layout }) => {
				layouts.save(worktree, layout);
				return {};
			},
			"projects.list": () => ({ projects: projects.list() }),
			"projects.add": ({ path }) => projects.add(path),
			"dialog.pickFolder": async () => ({ path: await pickFolder() }),
			"projects.remove": ({ id }) => {
				projects.remove(id);
				return {};
			},
			"projects.branches": async ({ id }) => ({
				branches: await worktrees.branches(id),
			}),
			"worktrees.create": (params) => worktrees.create(params),
			"worktrees.status": ({ id }) => worktrees.status(id),
			"worktrees.finishCheck": ({ id }) => worktrees.finishCheck(id),
			"worktrees.finish": ({ id, action, force }) =>
				worktrees.finish(id, action, force),
			"plugins.list": () => ({ plugins: plugins.plugins }),
			"plugins.runCommand": async ({ command }) => {
				await plugins.runCommand(command);
				return {};
			},
			"plugins.call": ({ plugin, method, params }) =>
				plugins.call(plugin, method, params),
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
	const projectsChanged = () =>
		server.emit("projects.changed", { projects: projects.list() });
	projects.onChange(projectsChanged);
	worktrees.onChange(projectsChanged);
	return server;
};
