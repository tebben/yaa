import { errorData, type Logger } from "@yaa/contracts/log";
import {
	type PluginCoreProtocol,
	pluginCoreProtocol,
} from "@yaa/contracts/plugin-host-protocol";
import type { Worktree } from "@yaa/contracts/projects";
import { createServer, type Server } from "@yaa/contracts/server";
import {
	createFile,
	readFolder,
	removePath,
	renamePath,
} from "../files/file-operations.ts";
import type { WorktreeWatches } from "../files/worktree-watches.ts";
import type { GitService } from "../git/git-service.ts";

type PluginApiOptions = {
	worktree(id: string): Worktree;
	git: Pick<GitService, "files" | "ignored" | "changes">;
	watches: WorktreeWatches;
	log: Logger;
};

// The core's side of the plugin API: what plugin backends read and do,
// asked by the plugin host (docs/spec/03-plugins.md).
export const createPluginApiServer = ({
	worktree,
	git,
	watches,
	log,
}: PluginApiOptions): Server<PluginCoreProtocol> => {
	const pathOf = (id: string) => worktree(id).path;
	const server = createServer(
		pluginCoreProtocol,
		{
			"worktrees.get": ({ id }) => worktree(id),
			"git.files": (params) => git.files(pathOf(params.worktree)),
			"git.ignored": async (params) => ({
				paths: await git.ignored(pathOf(params.worktree)),
			}),
			"git.changes": async (params) => ({
				changes: await git.changes(pathOf(params.worktree)),
			}),
			"files.readDir": async (params) => ({
				entries: await readFolder(pathOf(params.worktree), params.path),
			}),
			"files.create": async (params) => {
				await createFile(pathOf(params.worktree), params.path);
				return {};
			},
			"files.rename": async (params) => {
				await renamePath(pathOf(params.worktree), params.from, params.to);
				return {};
			},
			"files.remove": async (params) => {
				await removePath(pathOf(params.worktree), params.path);
				return {};
			},
			"files.watch": async (params) => {
				await watches.watch(params.worktree);
				return {};
			},
			"files.unwatch": (params) => {
				watches.unwatch(params.worktree);
				return {};
			},
		},
		{
			onError: (error) => log.warn("plugin API call failed", errorData(error)),
		},
	);
	watches.onChange((id) => server.emit("files.changed", { worktree: id }));
	return server;
};
