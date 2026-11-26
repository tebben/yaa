import type { FileContent } from "@yaa/contracts/worktree-files";
import type { PanelContext } from "@yaa/plugin-api/ui";
import type { editor } from "monaco-editor/editor";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { type Draft, editorProtocol } from "../protocol.ts";
import { diskChange } from "./disk.ts";
import { createModel } from "./monaco.svelte.ts";

// How long typing has to pause before unsaved text is stored.
const DRAFT_DELAY_MS = 300;

// One open file. Without a model there is no text to show, and `unreadable`
// says why.
export type Document = {
	model: editor.ITextModel | undefined;
	unreadable: "binary" | "tooLarge" | "missing" | undefined;
	// Where the disk stands against the text: `changed` under unsaved text,
	// or `deleted`.
	disk: "same" | "changed" | "deleted";
};

// What the controller knows of a model beside what it shows: the version on
// disk its text was made from, and the model's version id when it matched,
// -1 when it never did.
type Source = { version: string | null; saved: number };

type DocumentsOptions = {
	panel: PanelContext;
	// A file was edited.
	edited(path: string): void;
	fail(reason: unknown): void;
};

const BOM = "\uFEFF";

// The files the editor holds: their text, what is unsaved, and keeping them
// in step with the disk.
export const createDocuments = ({ panel, edited, fail }: DocumentsOptions) => {
	const server = panel.backend(editorProtocol);
	const worktree = panel.worktree.id;
	const documents = new SvelteMap<string, Document>();
	const dirty = new SvelteSet<string>();
	const sources = new Map<string, Source>();
	// Unsaved text of files without a model: as restored, until they load.
	const drafts = new Map<string, Draft>();
	// Set while the controller itself changes a model's text.
	let applying = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// One thing touches the disk at a time, so a read cannot see a write of
	// ours before the file knows it made it.
	let queue: Promise<unknown> = Promise.resolve();
	const inTurn = <T>(task: () => Promise<T>): Promise<T> => {
		const result = queue.then(task);
		queue = result.catch(() => undefined);
		return result;
	};

	const textOf = (model: editor.ITextModel) => model.getValue(undefined, true);

	const unsaved = (): Draft[] => [
		...drafts.values(),
		...[...dirty].flatMap((path) => {
			const model = documents.get(path)?.model;
			const source = sources.get(path);
			return model === undefined || source === undefined
				? []
				: [{ path, text: textOf(model), version: source.version }];
		}),
	];

	// Stores the unsaved text now, if a change is waiting to be.
	const flush = () => {
		if (timer === undefined) return;
		clearTimeout(timer);
		timer = undefined;
		server.request("saveDrafts", { worktree, drafts: unsaved() }).catch(fail);
	};
	const persist = () => {
		clearTimeout(timer);
		timer = setTimeout(flush, DRAFT_DELAY_MS);
	};

	const setDirty = (path: string, now: boolean) => {
		if (now) dirty.add(path);
		else dirty.delete(path);
		persist();
	};

	const set = (path: string, change: Partial<Document>) => {
		const document = documents.get(path);
		if (document !== undefined) documents.set(path, { ...document, ...change });
	};

	// A model of the text; `version` and `matches` say whether it is what the
	// disk has.
	const hold = (
		path: string,
		text: string,
		version: string | null,
		matches: boolean,
	) => {
		const model = createModel(worktree, path, text);
		const source = {
			version,
			saved: matches ? model.getAlternativeVersionId() : -1,
		};
		sources.set(path, source);
		model.onDidChangeContent(() => {
			if (applying) return;
			setDirty(path, model.getAlternativeVersionId() !== source.saved);
			edited(path);
		});
		documents.set(path, { model, unreadable: undefined, disk: "same" });
	};

	// Takes the disk's text into the model, as an edit that can be undone.
	const reload = (
		path: string,
		model: editor.ITextModel,
		source: Source,
		disk: Extract<FileContent, { kind: "text" }>,
	) => {
		const text = disk.text.startsWith(BOM) ? disk.text.slice(1) : disk.text;
		applying = true;
		try {
			if (model.getValue() !== text) {
				model.pushStackElement();
				model.pushEditOperations(
					[],
					[{ range: model.getFullModelRange(), text }],
					() => null,
				);
				model.pushStackElement();
			}
		} finally {
			applying = false;
		}
		source.version = disk.version;
		source.saved = model.getAlternativeVersionId();
		set(path, { disk: "same" });
		setDirty(path, false);
	};

	const read = (path: string) => server.request("read", { worktree, path });

	// Brings one file in step with the disk: loads it if it has no text yet.
	const refresh = async (path: string) => {
		const document = documents.get(path);
		if (document === undefined) return;
		const disk = await read(path);
		// Closed while this was reading.
		if (documents.get(path) === undefined) return;
		const { model } = documents.get(path) ?? document;
		const source = sources.get(path);
		if (model === undefined || source === undefined) {
			const draft = drafts.get(path);
			if (draft !== undefined) {
				drafts.delete(path);
				const matches = disk.kind === "text" && disk.text === draft.text;
				hold(path, draft.text, matches ? disk.version : draft.version, matches);
				setDirty(path, !matches);
				if (!matches) await refresh(path);
			} else if (disk.kind === "text") {
				hold(path, disk.text, disk.version, true);
			} else {
				set(path, { unreadable: disk.kind });
			}
			return;
		}
		const change = diskChange(
			{ version: source.version, dirty: dirty.has(path) },
			disk,
		);
		if (change === "reload" && disk.kind === "text") {
			reload(path, model, source, disk);
		} else if (change === "unreadable" && disk.kind !== "text") {
			model.dispose();
			sources.delete(path);
			documents.set(path, {
				model: undefined,
				unreadable: disk.kind,
				disk: "same",
			});
		} else if (change === "conflict") set(path, { disk: "changed" });
		else if (change === "deleted") set(path, { disk: "deleted" });
		else set(path, { disk: source.version === null ? "deleted" : "same" });
	};

	const write = async (path: string, overwrite: boolean) => {
		const document = documents.get(path);
		const source = sources.get(path);
		const model = document?.model;
		if (model === undefined || source === undefined) return false;
		const deleted = document?.disk === "deleted";
		if (!dirty.has(path) && !deleted && !overwrite) return true;
		// Typing during the write leaves the file unsaved.
		const saving = model.getAlternativeVersionId();
		const text = textOf(model);
		const send = (version: string | null) =>
			server.request("write", { worktree, path, text, version });
		let result = await send(deleted ? null : source.version);
		if (result.kind === "changed" && overwrite) {
			result = await send(result.version);
		}
		if (result.kind === "changed") {
			set(path, { disk: result.version === null ? "deleted" : "changed" });
			return false;
		}
		source.version = result.version;
		source.saved = saving;
		set(path, { disk: "same" });
		setDirty(path, model.getAlternativeVersionId() !== saving);
		return true;
	};

	const discard = (path: string) => {
		documents.get(path)?.model?.dispose();
		documents.delete(path);
		sources.delete(path);
		drafts.delete(path);
		setDirty(path, false);
	};

	return {
		get(path: string) {
			return documents.get(path);
		},
		isDirty(path: string) {
			return dirty.has(path);
		},
		// Takes the unsaved text kept from last time; its files are loaded when
		// they are opened.
		restore(kept: readonly Draft[]) {
			for (const draft of kept) {
				drafts.set(draft.path, draft);
				dirty.add(draft.path);
			}
		},
		// Loads the file, or checks the one already loaded against the disk.
		open(path: string): Promise<void> {
			if (!documents.has(path)) {
				documents.set(path, {
					model: undefined,
					unreadable: undefined,
					disk: "same",
				});
			}
			return inTurn(() => refresh(path));
		},
		// Checks every loaded file against the disk.
		async sync(): Promise<void> {
			// Each takes its own turn, so one that fails stops no other.
			await Promise.all(
				[...documents.keys()].map((path) => inTurn(() => refresh(path))),
			);
		},
		// Saves unless the file changed on disk meanwhile, or, with
		// `overwrite`, even then. Resolves to whether the text is on disk.
		save(path: string, overwrite = false): Promise<boolean> {
			return inTurn(() => write(path, overwrite));
		},
		// Drops the unsaved text for what is on disk.
		revert(path: string): Promise<void> {
			discard(path);
			return this.open(path);
		},
		// Forgets the file, unsaved text and all.
		discard,
		// Stores what is waiting and lets the models go.
		dispose() {
			flush();
			for (const { model } of documents.values()) model?.dispose();
			// A read still under way finds its file gone and makes no model.
			documents.clear();
		},
	};
};

export type Documents = ReturnType<typeof createDocuments>;
