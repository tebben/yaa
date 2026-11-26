import { fuzzyMatch } from "@yaa/commands/fuzzy-match";
import type { Disposable } from "@yaa/contracts/protocol";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { onDestroy } from "svelte";
import { editorProtocol, type TabsState } from "../protocol.ts";
import { createDocuments } from "./documents.svelte.ts";
import { createEditorView } from "./editor-view.svelte.ts";
import {
	activateTab,
	closeTab,
	cycleTab,
	keepTab,
	NO_TABS,
	openTab,
	reopenTab,
	tabLabels,
} from "./tabs.ts";

// How many files quick open lists.
const PICK_LIMIT = 50;

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The editor panel: its tabs, which survive restarts, the file on screen and
// the panel's commands. Call while the component sets up.
export const createEditorPanel = (panel: PanelContext) => {
	const server = panel.backend(editorProtocol);
	const worktree = panel.worktree.id;
	let tabs = $state.raw<TabsState>(NO_TABS);
	// The tab waiting for an answer on its unsaved text before it closes.
	let closing = $state<string>();
	let cancel: Disposable | undefined;
	// The last thing that failed, and why the worktree is not watched.
	let failure = $state<string>();
	let unwatched = $state<string>();
	const fail = (reason: unknown) => {
		failure = describe(reason);
	};

	const view = createEditorView();
	const documents = createDocuments({
		panel,
		// An edited file stays open.
		edited: (path) => {
			if (tabs.open.some((tab) => tab.path === path && tab.preview)) {
				update(keepTab(tabs, path));
			}
		},
		fail,
	});
	const active = $derived(
		tabs.active === null ? undefined : documents.get(tabs.active),
	);

	// Takes the tabs, lets go of the files no tab shows, loads the active one
	// and stores the result.
	const show = (next: TabsState) => {
		for (const { path } of tabs.open) {
			if (!next.open.some((tab) => tab.path === path)) documents.discard(path);
		}
		tabs = next;
		if (next.active !== null) documents.open(next.active).catch(fail);
	};
	// Nothing opens or closes until what was open is back, so it is not
	// overwritten.
	let back = false;
	const update = (next: TabsState) => {
		if (!back) return;
		const switched = next.active !== tabs.active;
		if (switched) show(next);
		else tabs = next;
		server.request("saveTabs", { worktree, tabs: next }).catch(fail);
	};

	const restored = server
		.request("restore", { worktree })
		.then(({ tabs: kept, drafts }) => {
			documents.restore(drafts);
			show(kept);
			back = true;
		});
	restored.catch(fail);
	const whenRestored = (task: () => void) => {
		restored.then(task).catch(fail);
	};

	const watch = () =>
		server.request("watch", { worktree }).then((result) => {
			unwatched = result.problem ?? undefined;
		}, fail);
	void watch();
	server.subscribe("changed", (changed) => {
		if (changed.worktree === worktree) documents.sync().catch(fail);
	});
	server.onRestart(() => {
		void watch();
		documents.sync().catch(fail);
	});

	$effect(() => {
		view.display(tabs.active ?? undefined, active?.model);
	});
	onDestroy(documents.dispose);

	const stopClosing = () => {
		closing = undefined;
		cancel?.dispose();
		cancel = undefined;
	};

	const close = (path: string) => {
		stopClosing();
		update(closeTab(tabs, path));
		if (tabs.active !== null) view.goTo(tabs.active);
	};

	// A tab with unsaved text asks first.
	const requestClose = (path: string) => {
		if (!documents.isDirty(path)) {
			close(path);
			return;
		}
		update(activateTab(tabs, path));
		closing = path;
		// Registered only while there is something to cancel, so Escape is the
		// editor's otherwise.
		cancel ??= panel.commands.register("editor.cancel", () => {
			stopClosing();
			view.focus();
		});
	};

	const select = (next: TabsState, to?: Parameters<typeof view.goTo>[1]) => {
		stopClosing();
		update(next);
		if (next.active !== null) view.goTo(next.active, to);
	};

	const save = async (path: string, overwrite = false) => {
		failure = undefined;
		try {
			// A restored file that was never shown has no text to write yet.
			await documents.open(path);
			return await documents.save(path, overwrite);
		} catch (error) {
			fail(error);
			return false;
		}
	};

	const quickOpen = async () => {
		const { files } = await server.request("list", { worktree });
		panel.pick({
			label: "Go to file",
			placeholder: "Type a file name",
			items: (query) =>
				fuzzyMatch(query, files, (path) => path)
					.slice(0, PICK_LIMIT)
					.map((path) => ({ id: path, label: path, mono: true })),
			empty: () => "No matching files",
			accept: ({ id }) => select(openTab(tabs, id, false)),
		});
	};

	const onActive = (task: (path: string) => void) => () => {
		if (tabs.active !== null) task(tabs.active);
	};
	const commands: Record<string, () => void> = {
		"editor.quickOpen": () => whenRestored(() => quickOpen().catch(fail)),
		"editor.save": onActive((path) => void save(path)),
		"editor.nextTab": () => select(cycleTab(tabs, 1)),
		"editor.previousTab": () => select(cycleTab(tabs, -1)),
		"editor.closeTab": onActive(requestClose),
		"editor.reopenTab": () => select(reopenTab(tabs)),
		"editor.keepTab": onActive((path) => update(keepTab(tabs, path))),
	};
	for (const [command, run] of Object.entries(commands)) {
		panel.commands.register(command, run);
	}
	panel.handleClose(() => {
		const { active: path } = tabs;
		if (path === null) return false;
		if (closing !== path) requestClose(path);
		return true;
	});
	panel.handleOpenFile(({ path, line, keep, focus }) =>
		whenRestored(() =>
			select(openTab(tabs, path, keep ?? false), { line, focus }),
		),
	);

	return {
		view,
		get tabs() {
			const labels = tabLabels(tabs.open.map((tab) => tab.path));
			return tabs.open.map((tab, index) => ({
				...tab,
				name: labels[index]?.name ?? tab.path,
				folder: labels[index]?.folder,
				active: tab.path === tabs.active,
				dirty: documents.isDirty(tab.path),
				deleted: documents.get(tab.path)?.disk === "deleted",
			}));
		},
		// The file on screen, if a tab is open.
		get active() {
			return tabs.active === null
				? undefined
				: { path: tabs.active, document: active };
		},
		get closing() {
			return closing;
		},
		get problem() {
			return failure ?? unwatched;
		},
		select: (path: string) => select(activateTab(tabs, path)),
		keep: (path: string) => update(keepTab(tabs, path)),
		close: requestClose,
		save: (path: string) => void save(path),
		overwrite: (path: string) => void save(path, true),
		revert(path: string) {
			documents.revert(path).catch(fail);
		},
		// The answers to the question before closing.
		async saveAndClose(path: string) {
			if (await save(path)) close(path);
			else stopClosing();
		},
		discardAndClose: close,
		keepOpen() {
			stopClosing();
			view.focus();
		},
	};
};

export type EditorPanelController = ReturnType<typeof createEditorPanel>;
