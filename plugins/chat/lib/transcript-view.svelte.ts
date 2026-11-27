import type { QuestionAnswer } from "@yaa/contracts/agent-events";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { SvelteMap } from "svelte/reactivity";
import { worktreeFile } from "./file-reference.ts";
import type { FieldValues } from "./question.ts";
import type { Session } from "./sessions.svelte.ts";

type TranscriptViewOptions = {
	panel: PanelContext;
	session(): Session | undefined;
	failed(reason: unknown): void;
};

// What a transcript's entries do and remember. It is kept here, not in the
// entries, which the virtual list unmounts as they scroll away.
export const createTranscriptView = ({
	panel,
	session,
	failed,
}: TranscriptViewOptions) => {
	// The entries opened or closed by hand.
	const toggled = new SvelteMap<string, boolean>();
	const answers = new SvelteMap<string, FieldValues>();
	let scroller: ((pages: number) => void) | undefined;

	const entry = (key: number) => `${session()?.id} ${key}`;
	const send = (action: (sessionId: string) => Promise<void>) => {
		const id = session()?.id;
		if (id !== undefined) action(id).catch(failed);
	};
	const root = panel.worktree.path;

	return {
		root,
		// Opens a file of the worktree in the editor; a relative path or one
		// under its folder.
		openFile(path: string, line?: number) {
			const found = worktreeFile(path, root);
			if (found !== undefined)
				panel.openDocument({ target: { kind: "file", path: found }, line });
		},
		isOpen: (key: number, otherwise: boolean) =>
			toggled.get(entry(key)) ?? otherwise,
		toggle(key: number, otherwise: boolean) {
			const id = entry(key);
			toggled.set(id, !(toggled.get(id) ?? otherwise));
		},
		values: (key: number): FieldValues => answers.get(entry(key)) ?? {},
		setValue(key: number, name: string, value: FieldValues[string]) {
			const id = entry(key);
			answers.set(id, { ...answers.get(id), [name]: value });
		},
		answerPermission(requestId: string, optionId: string) {
			send((id) => panel.agents.answerPermission(id, requestId, optionId));
		},
		answerQuestion(requestId: string, answer: QuestionAnswer) {
			send((id) => panel.agents.answerQuestion(id, requestId, answer));
		},
		// The list on screen says how it scrolls.
		scrolls(by: (pages: number) => void) {
			scroller = by;
			return () => {
				if (scroller === by) scroller = undefined;
			};
		},
		scroll: (pages: number) => scroller?.(pages),
	};
};

export type TranscriptView = ReturnType<typeof createTranscriptView>;
