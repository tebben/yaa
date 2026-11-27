import type { EditorTarget, FileContent } from "@yaa/contracts/worktree-files";
import type { PanelContext } from "@yaa/plugin-api/ui";
import type { editor } from "monaco-editor/editor";
import { tick } from "svelte";
import { editorProtocol } from "../protocol.ts";
import { createModel } from "./monaco.svelte.ts";

type DiffTarget = Extract<EditorTarget, { kind: "diff" }>;
type DiffModels = {
	original: editor.ITextModel;
	modified: editor.ITextModel;
	readOnly: boolean;
	owned: editor.ITextModel[];
};

const text = (content: FileContent) =>
	content.kind === "text"
		? content.text
		: content.kind === "missing"
			? ""
			: undefined;

export const createDiffModels = (
	panel: PanelContext,
	fail: (reason: unknown) => void,
) => {
	const server = panel.backend(editorProtocol);
	const worktree = panel.worktree.id;
	let current = $state.raw<DiffModels>();
	let problem = $state<string>();
	let generation = 0;
	const release = (models: DiffModels | undefined) => {
		if (models !== undefined) for (const model of models.owned) model.dispose();
	};
	const replace = (models: DiffModels | undefined) => {
		const previous = current;
		current = models;
		void tick().then(() => release(previous));
	};
	return {
		get models() {
			return current;
		},
		get problem() {
			return problem;
		},
		async load(
			target: DiffTarget | undefined,
			modified: editor.ITextModel | undefined,
			unreadable: "binary" | "tooLarge" | "missing" | undefined,
		) {
			const revision = ++generation;
			if (target === undefined) {
				problem = undefined;
				replace(undefined);
				return;
			}
			if (
				target.section === "unstaged" &&
				(unreadable === "binary" || unreadable === "tooLarge")
			) {
				problem = "This diff is binary or too large to open.";
				replace(undefined);
				return;
			}
			try {
				const { changes } = await server.request("changes", { worktree });
				const change = changes.find((item) => item.path === target.path);
				const originalPath =
					target.section === "staged"
						? (change?.originalPath ?? target.path)
						: target.path;
				const [before, after] = await Promise.all([
					server.request("readGit", {
						worktree,
						path: originalPath,
						source: target.section === "staged" ? "head" : "index",
					}),
					target.section === "staged"
						? server.request("readGit", {
								worktree,
								path: target.path,
								source: "index",
							})
						: Promise.resolve(undefined),
				]);
				if (revision !== generation) return;
				const originalText = text(before);
				const modifiedText = after === undefined ? "" : text(after);
				if (originalText === undefined || modifiedText === undefined) {
					problem = "This diff is binary or too large to open.";
					replace(undefined);
					return;
				}
				const original = createModel(worktree, target.path, originalText);
				const owned = [original];
				const right =
					target.section === "unstaged" && modified !== undefined
						? modified
						: createModel(worktree, target.path, modifiedText);
				if (right !== modified) owned.push(right);
				problem = undefined;
				replace({
					original,
					modified: right,
					owned,
					readOnly: target.section === "staged" || modified === undefined,
				});
			} catch (error) {
				if (revision !== generation) return;
				problem = error instanceof Error ? error.message : String(error);
				replace(undefined);
				fail(error);
			}
		},
		dispose() {
			generation += 1;
			release(current);
			current = undefined;
		},
	};
};
