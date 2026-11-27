import type {
	GitAction,
	GitChange,
	GitSection,
} from "@yaa/contracts/worktree-files";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { gitProtocol } from "../protocol.ts";
import { changeRows } from "./change-rows.ts";

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

export const createGitPanel = (panel: PanelContext) => {
	const server = panel.backend(gitProtocol);
	const worktree = panel.worktree.id;
	let changes = $state.raw<GitChange[]>([]);
	let problem = $state<string>();
	let message = $state("");
	let busy = $state(false);
	let tree = $state(true);
	let confirm = $state.raw<{ section: GitSection; paths: string[] }>();
	let reading: Promise<void> | undefined;
	let again = false;
	const refresh = () => {
		if (reading !== undefined) {
			again = true;
			return reading;
		}
		reading = (async () => {
			try {
				do {
					again = false;
					const result = await server.request("list", { worktree });
					changes = result.changes;
					problem = result.problem ?? undefined;
				} while (again);
			} catch (error) {
				problem = describe(error);
			} finally {
				reading = undefined;
			}
		})();
		return reading;
	};
	server.subscribe("changed", (event) => {
		if (event.worktree === worktree) void refresh();
	});
	server.onRestart(() => void refresh());
	void refresh();

	const run = async (task: () => Promise<void>) => {
		if (busy) return;
		busy = true;
		problem = undefined;
		try {
			await task();
			await refresh();
		} catch (error) {
			problem = describe(error);
		} finally {
			busy = false;
		}
	};
	const change = (action: GitAction, section: GitSection, paths: string[]) =>
		void run(async () => {
			await server.request("change", { worktree, action, section, paths });
		});
	return {
		get changes() {
			return changes;
		},
		get problem() {
			return problem;
		},
		get busy() {
			return busy;
		},
		get tree() {
			return tree;
		},
		rows(section: GitSection) {
			return changeRows(changes, section, tree);
		},
		toggleTree() {
			tree = !tree;
		},
		open(section: GitSection, path: string, focus: boolean, keep = false) {
			panel.openDocument({
				target: { kind: "diff", path, section },
				keep,
				focus,
			});
		},
		get message() {
			return message;
		},
		set message(value: string) {
			message = value;
		},
		get confirm() {
			return confirm;
		},
		stage(paths: string[]) {
			change("stage", "unstaged", paths);
		},
		unstage(paths: string[]) {
			change("unstage", "staged", paths);
		},
		askDiscard(section: GitSection, paths: string[]) {
			confirm = { section, paths };
		},
		cancelDiscard() {
			confirm = undefined;
		},
		discard() {
			if (confirm === undefined) return;
			change("discard", confirm.section, confirm.paths);
			confirm = undefined;
		},
		commit() {
			void run(async () => {
				await server.request("commit", { worktree, message });
				message = "";
			});
		},
	};
};

export type GitPanelController = ReturnType<typeof createGitPanel>;
