import { coreProtocol } from "@yaa/contracts/core-protocol";
import type { KeybindingsState } from "@yaa/contracts/keybindings";
import { errorData, type Logger } from "@yaa/contracts/log";
import type { PickTarget } from "@yaa/contracts/process-control";
import { createServer, type Server } from "@yaa/contracts/server";
import type { AgentSessions } from "./agents/agent-sessions.ts";
import type { PluginManager } from "./plugins/plugins.ts";
import type { Projects } from "./projects/projects.ts";
import type { Worktrees } from "./projects/worktrees.ts";
import type { AppSettings } from "./settings/app-settings.ts";
import type { SettingsFile } from "./settings/watch-settings-file.ts";
import type { StateTracker } from "./state/state-tracker.ts";
import type { LayoutStore } from "./storage/layout-store.ts";
import type { PlaceStore } from "./storage/place-store.ts";
import type { Terminals } from "./terminals/terminals.ts";

export type CoreServerOptions = {
	log: Logger;
	settings: AppSettings;
	keybindings: SettingsFile<KeybindingsState>;
	layouts: LayoutStore;
	place: PlaceStore;
	plugins: PluginManager;
	agents: AgentSessions;
	projects: Projects;
	worktrees: Worktrees;
	states: StateTracker;
	terminals: Terminals;
	pick(target: PickTarget): Promise<string[]>;
};

export const createCoreServer = ({
	log,
	settings,
	keybindings,
	layouts,
	place,
	plugins,
	agents,
	projects,
	worktrees,
	states,
	terminals,
	pick,
}: CoreServerOptions): Server<typeof coreProtocol> => {
	const server = createServer(
		coreProtocol,
		{
			"settings.get": () => settings.current(),
			"settings.set": (change) => {
				settings.set(change);
				return {};
			},
			"keybindings.get": () => keybindings.current(),
			"layout.get": ({ worktree }) => ({
				layout: layouts.get(worktree) ?? null,
			}),
			"layout.save": ({ worktree, layout }) => {
				layouts.save(worktree, layout);
				return {};
			},
			"place.get": () => ({ place: place.get() ?? null }),
			"place.save": (next) => {
				place.save(next);
				return {};
			},
			"projects.list": () => ({ projects: projects.list() }),
			"projects.add": ({ path }) => projects.add(path),
			"dialog.pickFolder": async () => ({
				path: (await pick("folder"))[0] ?? null,
			}),
			"dialog.pickFiles": async () => ({ paths: await pick("files") }),
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
			"worktrees.reopen": ({ id }) => worktrees.reopen(id),
			"worktrees.states": () => ({ states: states.states() }),
			"worktrees.setDone": ({ id, done }) => {
				states.append({ type: "worktree.done.set", worktree: id, done });
				return {};
			},
			"plugins.list": () => ({ plugins: plugins.plugins }),
			"plugins.runCommand": async ({ command }) => {
				await plugins.runCommand(command);
				return {};
			},
			"plugins.call": ({ plugin, method, params }) =>
				plugins.call(plugin, method, params),
			"terminals.list": ({ worktree }) => ({
				terminals: terminals.list(worktree),
			}),
			"terminals.create": ({ worktree }) => ({
				id: terminals.create(worktree),
			}),
			"terminals.close": ({ id }) => {
				terminals.close(id);
				return {};
			},
			"terminals.attach": ({ id, view, cols, rows }, caller) =>
				terminals.attach({ id, view }, { cols, rows }, caller),
			"terminals.detach": ({ id, view }) => {
				terminals.detach(id, view);
				return {};
			},
			"terminals.ack": ({ id, view, offset }) => {
				terminals.ack(id, view, offset);
				return {};
			},
			"terminals.write": ({ id, data }) => {
				terminals.write(id, data);
				return {};
			},
			"terminals.resize": ({ id, cols, rows }) => {
				terminals.resize(id, { cols, rows });
				return {};
			},
			"providers.status": ({ provider }) => plugins.providerStatus(provider),
			"agent.start": async ({ worktree, provider }) => ({
				sessionId: await agents.start(worktree, provider),
			}),
			"agent.sessions": () => ({ sessions: agents.list() }),
			"agent.prompt": ({ sessionId, text, attachments }) => {
				agents.prompt(sessionId, text, attachments);
				return {};
			},
			"agent.setConfig": async ({ sessionId, configId, value }) => {
				await agents.setConfig(sessionId, configId, value);
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
	states.onChange(() =>
		server.emit("worktrees.statesChanged", { states: states.states() }),
	);
	terminals.onOutput((output) => server.emit("terminals.output", output));
	terminals.onChange((worktree) =>
		server.emit("terminals.changed", {
			worktree,
			terminals: terminals.list(worktree),
		}),
	);
	return server;
};
