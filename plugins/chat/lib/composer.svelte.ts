import type { PromptAttachment } from "@yaa/contracts/agent-events";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { editField } from "@yaa/ui/focus";
import { SvelteMap } from "svelte/reactivity";
import type { Session } from "./sessions.svelte.ts";
import { suggestCommands } from "./suggestions.ts";

export type Draft = { text: string; attachments: PromptAttachment[] };

const EMPTY: Draft = { text: "", attachments: [] };

// An image pasted into the prompt, as the prompt carries it.
const readImage = (file: File) =>
	new Promise<PromptAttachment>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			// A data URL: its data follows the first comma.
			const url = String(reader.result);
			resolve({
				type: "image",
				name: file.name,
				mimeType: file.type,
				data: url.slice(url.indexOf(",") + 1),
			});
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});

type ComposerOptions = {
	panel: PanelContext;
	// The chat on screen.
	session(): Session | undefined;
	failed(reason: unknown): void;
};

// The prompt being written: a draft per chat, so each keeps its own, with
// the slash commands suggested for it and its keys. Call while the component
// sets up.
export const createComposer = ({ panel, session, failed }: ComposerOptions) => {
	const drafts = new SvelteMap<string, Draft>();
	let input: HTMLTextAreaElement | undefined;
	// The next input to mount takes focus.
	let wanted = false;
	let focused = $state(false);
	// The draft whose suggestions Escape dismissed.
	let dismissed = $state<string>();
	let selected = $state(0);

	const draft = $derived(drafts.get(session()?.id ?? "") ?? EMPTY);
	const suggestions = $derived(
		draft.text === dismissed
			? []
			: suggestCommands(draft.text, session()?.transcript.commands ?? []),
	);
	// The list can shrink under the selection.
	const current = $derived(Math.min(selected, suggestions.length - 1));

	const write = (id: string, change: Partial<Draft>) => {
		drafts.set(id, { ...(drafts.get(id) ?? EMPTY), ...change });
	};
	const setText = (text: string) => {
		const id = session()?.id;
		if (id === undefined) return;
		selected = 0;
		write(id, { text });
	};
	const attach = (attachments: readonly PromptAttachment[]) => {
		const id = session()?.id;
		if (id === undefined || attachments.length === 0) return;
		write(id, {
			attachments: [...(drafts.get(id) ?? EMPTY).attachments, ...attachments],
		});
	};

	const focus = () => {
		if (input === undefined) wanted = true;
		else editField(input);
	};

	// While a turn runs the draft stays, to be sent after it.
	const send = () => {
		const shown = session();
		if (shown === undefined || shown.transcript.running) return;
		const sent = draft;
		if (sent.text.trim() === "" && sent.attachments.length === 0) return;
		drafts.delete(shown.id);
		panel.agents
			.prompt(shown.id, sent.text, sent.attachments)
			.catch((reason: unknown) => {
				if (!drafts.has(shown.id)) drafts.set(shown.id, sent);
				failed(reason);
			});
	};

	const accept = (name = suggestions[current]?.name) => {
		if (name === undefined) return;
		setText(`/${name} `);
		focus();
	};

	// Registered only while they can act, so their keys are free otherwise.
	const bind = (when: () => boolean, handlers: Record<string, () => void>) => {
		$effect(() => {
			if (!when()) return;
			const registered = Object.entries(handlers).map(([command, run]) =>
				panel.commands.register(command, run),
			);
			return () => {
				for (const registration of registered) registration.dispose();
			};
		});
	};
	bind(() => focused, { "chat.send": send });
	bind(() => focused && suggestions.length > 0, {
		"chat.acceptSuggestion": () => accept(),
		"chat.nextSuggestion": () => {
			selected = (current + 1) % suggestions.length;
		},
		"chat.previousSuggestion": () => {
			selected = (current + suggestions.length - 1) % suggestions.length;
		},
		"chat.dismissSuggestions": () => {
			dismissed = draft.text;
		},
	});

	return {
		get draft() {
			return draft;
		},
		get suggestions() {
			return suggestions;
		},
		get selected() {
			return current;
		},
		setText,
		send,
		accept,
		focus,
		// Starts a slash command, unless something else is being written.
		slash() {
			if (draft.text === "") {
				dismissed = undefined;
				setText("/");
			}
			focus();
		},
		input(node: HTMLTextAreaElement) {
			input = node;
			if (wanted) node.focus();
			wanted = false;
			return () => {
				input = undefined;
				focused = false;
			};
		},
		focused(has: boolean) {
			focused = has;
		},
		async pickFiles() {
			try {
				const paths = await panel.pickFiles();
				attach(paths.map((path) => ({ type: "file", path })));
				focus();
			} catch (reason) {
				failed(reason);
			}
		},
		// Takes the images of a paste; false when it held none, so the paste
		// goes on as text.
		paste(files: Iterable<File>): boolean {
			const images = [...files].filter(({ type }) => type.startsWith("image/"));
			if (images.length === 0) return false;
			if (session()?.transcript.images !== true) {
				failed("This agent takes no images");
				return true;
			}
			Promise.all(images.map(readImage)).then(attach, failed);
			return true;
		},
		remove(index: number) {
			const id = session()?.id;
			if (id === undefined) return;
			write(id, {
				attachments: draft.attachments.filter((_, at) => at !== index),
			});
		},
	};
};

export type Composer = ReturnType<typeof createComposer>;
