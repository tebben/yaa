import { fuzzyMatch } from "@yaa/commands/fuzzy-match";
import type { Disposable } from "@yaa/contracts/protocol";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { onDestroy, tick, untrack } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { editorProtocol, type TabsState } from "../protocol.ts";
import { createDiffModels } from "./diff-models.svelte.ts";
import { createDiffView } from "./diff-view.svelte.ts";
import { createDocuments } from "./documents.svelte.ts";
import { editorSettings } from "./editor-options.ts";
import { createEditorView } from "./editor-view.svelte.ts";
import { imageMime } from "./markdown-preview.svelte.ts";
import {
	activateTab,
	closeTab,
	cycleTab,
	keepTab,
	NO_TABS,
	openTab,
	reopenTab,
	tabLabels,
	targetKey,
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
	const reading = new SvelteSet<string>();
	const outlines = new SvelteSet<string>();
	// The tab waiting for an answer on its unsaved text before it closes.
	let closing = $state<string>();
	let cancel: Disposable | undefined;
	// The last thing that failed, and why the worktree is not watched.
	let failure = $state<string>();
	let unwatched = $state<string>();
	const fail = (reason: unknown) => {
		failure = describe(reason);
	};

	const view = createEditorView(() => saveActive(), panel.captureKeys);
	const diffView = createDiffView(() => saveActive(), panel.captureKeys);
	const diffs = createDiffModels(panel, fail);
	panel.settings.watch((values) => {
		const settings = editorSettings.parse(values);
		view.configure(settings);
		diffView.configure(settings);
	});
	const documents = createDocuments({
		panel,
		// An edited file stays open.
		edited: (path) => {
			for (const tab of tabs.open) {
				if (tab.target.path === path && tab.preview) {
					update(keepTab(tabs, targetKey(tab.target)));
				}
			}
		},
		fail,
	});
	const selectedTarget = $derived(
		tabs.open.find((tab) => targetKey(tab.target) === tabs.active)?.target,
	);
	const active = $derived(
		selectedTarget === undefined
			? undefined
			: documents.get(selectedTarget.path),
	);
	const diffModified = $derived(
		selectedTarget !== undefined &&
			active?.disk === "deleted" &&
			!documents.isDirty(selectedTarget.path)
			? undefined
			: active?.model,
	);
	const markdown = $derived(
		selectedTarget?.kind === "file" &&
			/\.md$/i.test(selectedTarget.path) &&
			active?.model !== undefined,
	);
	const readMode = $derived(
		selectedTarget?.kind === "file" && reading.has(selectedTarget.path),
	);
	let preview: HTMLElement | undefined;
	const toggleMarkdown = () => {
		const path = selectedTarget?.path;
		if (!markdown || path === undefined) return;
		if (reading.has(path)) {
			reading.delete(path);
			void tick().then(() => view.focus());
		} else {
			reading.add(path);
			void tick().then(() => preview?.focus());
		}
	};
	const toggleToc = () => {
		const path = selectedTarget?.path;
		if (path === undefined || !markdown || !readMode) return;
		if (outlines.has(path)) outlines.delete(path);
		else outlines.add(path);
	};
	$effect(() => {
		if (!markdown) return;
		const mode = panel.commands.register(
			"editor.toggleMarkdown",
			toggleMarkdown,
		);
		const toc = readMode
			? panel.commands.register("editor.toggleMarkdownToc", toggleToc)
			: undefined;
		return () => {
			mode.dispose();
			toc?.dispose();
		};
	});

	// Takes the tabs, lets go of the files no tab shows, loads the active one
	// and stores the result.
	const show = (next: TabsState) => {
		for (const { target } of tabs.open) {
			const { path } = target;
			if (!next.open.some((tab) => tab.target.path === path)) {
				documents.discard(path);
				reading.delete(path);
				outlines.delete(path);
			}
		}
		tabs = next;
		const target = next.open.find(
			(tab) => targetKey(tab.target) === next.active,
		)?.target;
		if (
			target !== undefined &&
			(target.kind === "file" || target.section === "unstaged")
		) {
			documents
				.open(target.path)
				.then(() => {
					if (target.kind === "diff" && target.section === "unstaged") {
						documents.createMissing(target.path);
					}
				})
				.catch(fail);
		}
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
		if (changed.worktree === worktree) {
			documents.sync().catch(fail);
			void diffs.load(
				selectedTarget?.kind === "diff" ? selectedTarget : undefined,
				diffModified,
				active?.unreadable,
			);
		}
	});
	server.onRestart(() => {
		void watch();
		documents.sync().catch(fail);
		void diffs.load(
			selectedTarget?.kind === "diff" ? selectedTarget : undefined,
			diffModified,
			active?.unreadable,
		);
	});

	$effect(() => {
		view.display(
			selectedTarget?.kind === "file" ? selectedTarget.path : undefined,
			selectedTarget?.kind === "file" ? active?.model : undefined,
		);
	});
	$effect(() => {
		const target = selectedTarget;
		const model = diffModified;
		const unreadable = active?.unreadable;
		untrack(
			() =>
				void diffs.load(
					target?.kind === "diff" ? target : undefined,
					model,
					unreadable,
				),
		);
	});
	$effect(() => diffView.display(diffs.models));
	onDestroy(documents.dispose);
	onDestroy(diffs.dispose);

	const stopClosing = () => {
		closing = undefined;
		cancel?.dispose();
		cancel = undefined;
	};

	const goTo = (path: string, to?: Parameters<typeof view.goTo>[1]) => {
		if (reading.has(path) && to?.line === undefined) {
			if (to?.focus !== false) void tick().then(() => preview?.focus());
		} else view.goTo(path, to);
	};

	const close = (id: string) => {
		stopClosing();
		update(closeTab(tabs, id));
		const next = tabs.open.find(
			(tab) => targetKey(tab.target) === tabs.active,
		)?.target;
		if (next?.kind === "file") goTo(next.path);
	};

	// A tab with unsaved text asks first.
	const requestClose = (id: string) => {
		const target = tabs.open.find(
			(tab) => targetKey(tab.target) === id,
		)?.target;
		if (target === undefined) return;
		const { path } = target;
		if (
			!documents.isDirty(path) ||
			tabs.open.some(
				(tab) => tab.target.path === path && targetKey(tab.target) !== id,
			)
		) {
			close(id);
			return;
		}
		update(activateTab(tabs, id));
		closing = id;
		// Registered only while there is something to cancel, so Escape is the
		// editor's otherwise.
		cancel ??= panel.commands.register("editor.cancel", () => {
			stopClosing();
			view.focus();
		});
	};

	const select = (next: TabsState, to?: Parameters<typeof view.goTo>[1]) => {
		stopClosing();
		const target = next.open.find(
			(tab) => targetKey(tab.target) === next.active,
		)?.target;
		if (target !== undefined && to?.line !== undefined)
			reading.delete(target.path);
		update(next);
		if (target?.kind === "file") goTo(target.path, to);
		else if (target?.kind === "diff" && to?.focus !== false)
			void tick().then(() => diffView.focus());
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
			accept: ({ id }) =>
				select(openTab(tabs, { kind: "file", path: id }, false)),
		});
	};

	const saveActive = () => {
		if (
			selectedTarget !== undefined &&
			(selectedTarget.kind === "file" || selectedTarget.section === "unstaged")
		) {
			void save(selectedTarget.path);
		}
	};
	const commands: Record<string, () => void> = {
		"editor.quickOpen": () => whenRestored(() => quickOpen().catch(fail)),
		"editor.save": saveActive,
		"editor.nextTab": () => select(cycleTab(tabs, 1)),
		"editor.previousTab": () => select(cycleTab(tabs, -1)),
		"editor.closeTab": () => {
			if (tabs.active !== null) requestClose(tabs.active);
		},
		"editor.reopenTab": () => select(reopenTab(tabs)),
		"editor.keepTab": () => {
			if (tabs.active !== null) update(keepTab(tabs, tabs.active));
		},
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
	panel.handleOpenDocument(({ target, line, keep, focus }) =>
		whenRestored(() =>
			select(
				openTab(
					tabs,
					target,
					keep === true ||
						(target.kind === "diff" && tabs.active === targetKey(target)),
				),
				{ line, focus },
			),
		),
	);

	return {
		view,
		diffView,
		get diffProblem() {
			return diffs.problem;
		},
		get markdown() {
			return markdown;
		},
		get readMode() {
			return readMode;
		},
		get toc() {
			return selectedTarget !== undefined && outlines.has(selectedTarget.path);
		},
		toggleMarkdown,
		toggleToc,
		setPreview(element: HTMLElement | undefined) {
			preview = element;
		},
		async readImage(path: string) {
			const mime = imageMime(path);
			if (mime === undefined) throw new Error("Unsupported image type");
			const result = await server.request("readBytes", { worktree, path });
			if (result.kind !== "bytes") throw new Error(result.kind);
			return { data: result.data, mime };
		},
		fetchImage: (url: string) => server.request("fetchImage", { url }),
		openMarkdownFile: (path: string) =>
			select(openTab(tabs, { kind: "file", path }, false)),
		get tabs() {
			const labels = tabLabels(tabs.open.map((tab) => tab.target.path));
			return tabs.open.map((tab, index) => ({
				id: targetKey(tab.target),
				name: labels[index]?.name ?? tab.target.path,
				detail:
					tab.target.kind === "diff"
						? tab.target.section
						: labels[index]?.folder,
				title: tab.target.path,
				active: targetKey(tab.target) === tabs.active,
				italic: tab.preview,
				struck: documents.get(tab.target.path)?.disk === "deleted",
				dot: documents.isDirty(tab.target.path) ? "unsaved" : undefined,
			}));
		},
		// The file on screen, if a tab is open.
		get active() {
			return selectedTarget === undefined
				? undefined
				: {
						path: selectedTarget.path,
						target: selectedTarget,
						document: active,
					};
		},
		get closing() {
			return closing;
		},
		get closingPath() {
			return tabs.open.find((tab) => targetKey(tab.target) === closing)?.target
				.path;
		},
		get problem() {
			return failure ?? unwatched;
		},
		select: (path: string) => select(activateTab(tabs, path)),
		keep: (path: string) => update(keepTab(tabs, path)),
		close: requestClose,
		closeActive() {
			if (tabs.active !== null) requestClose(tabs.active);
		},
		save: (path: string) => void save(path),
		overwrite: (path: string) => void save(path, true),
		revert(path: string) {
			documents.revert(path).catch(fail);
		},
		// The answers to the question before closing.
		async saveAndClose(id: string) {
			const target = tabs.open.find(
				(tab) => targetKey(tab.target) === id,
			)?.target;
			if (target !== undefined && (await save(target.path))) close(id);
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
