import { fuzzyMatch } from "@yaa/commands/fuzzy-match";
import type { PanelContext } from "@yaa/plugin-api/ui";
import {
	chatStatus,
	chatTitle,
	configOption,
	optionLabel,
	optionsSummary,
} from "./chat-summary.ts";
import { createComposer } from "./composer.svelte.ts";
import { createProviders } from "./providers.svelte.ts";
import { createSessions, type Session } from "./sessions.svelte.ts";
import { createTranscriptView } from "./transcript-view.svelte.ts";

// The config option categories the app has pickers for, in the order they
// show.
const CATEGORIES = ["mode", "model", "thought_level"] as const;
type Category = (typeof CATEGORIES)[number];

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The chat panel: the worktree's chats, the one on screen, and the panel's
// commands. Call while the component sets up.
export const createChatPanel = (panel: PanelContext) => {
	// The last thing that failed.
	let failure = $state<string>();
	const failed = (reason: unknown) => {
		failure = describe(reason);
	};
	const sessions = createSessions(panel.agents, failed);
	const providers = createProviders(panel.agents, failed);
	// The chat picked here; without one, the latest.
	let chosen = $state<string>();
	// Whether the panel asks which agent a new chat is with.
	let asking = $state(false);
	let starting = $state(false);

	const shown = $derived(
		asking ? undefined : (sessions.get(chosen ?? "") ?? sessions.all.at(-1)),
	);
	const session = () => shown;
	const composer = createComposer({ panel, session, failed });
	const view = createTranscriptView({ panel, session, failed });

	const show = (id: string) => {
		failure = undefined;
		chosen = id;
		asking = false;
		composer.focus();
	};

	const start = async (provider: string) => {
		if (starting) return;
		starting = true;
		failure = undefined;
		try {
			const id = await panel.agents.start(provider);
			sessions.started(id, provider);
			show(id);
		} catch (reason) {
			failed(reason);
		} finally {
			starting = false;
		}
	};

	const detail = ({ provider, transcript }: Session) => {
		const status = chatStatus(transcript);
		const title = providers.title(provider);
		return status === "idle" ? title : `${title} · ${status}`;
	};

	const pickChat = () => {
		const chats = sessions.all.toReversed();
		panel.pick({
			label: "Switch chat",
			placeholder: "Type a chat's title",
			items: (query) =>
				fuzzyMatch(query, chats, ({ transcript }) => chatTitle(transcript)).map(
					(chat) => ({
						id: chat.id,
						label: chatTitle(chat.transcript),
						detail: detail(chat),
					}),
				),
			empty: () => "No chats in this worktree",
			accept: ({ id }) => show(id),
		});
	};

	const optionOf = (category: Category) =>
		shown && configOption(shown.transcript, category);

	const pickOption = (category: Category) => {
		const id = shown?.id;
		const option = optionOf(category);
		if (id === undefined || option?.choices === undefined) return;
		const { choices, value } = option;
		panel.pick({
			label: option.name,
			placeholder: option.name,
			items: (query) =>
				fuzzyMatch(query, choices, ({ label }) => label).map((choice) => ({
					id: choice.value,
					label: choice.label,
					...(choice.value === value ? { detail: "current" } : {}),
				})),
			empty: () => "No such choice",
			accept(item) {
				panel.agents.setConfig(id, option.id, item.id).catch(failed);
				composer.focus();
			},
		});
	};

	const newChat = () => {
		failure = undefined;
		asking = true;
	};

	// Escape stops the turn; registered only while one runs.
	$effect(() => {
		const id = shown?.transcript.running ? shown.id : undefined;
		if (id === undefined) return;
		const stop = panel.commands.register("chat.stop", () => {
			panel.agents.cancel(id).catch(failed);
		});
		return () => stop.dispose();
	});

	const commands: Record<string, () => void> = {
		"chat.new": newChat,
		"chat.switch": pickChat,
		"chat.compose": () => composer.focus(),
		"chat.slash": () => composer.slash(),
		"chat.attach": () => void composer.pickFiles(),
		"chat.mode": () => pickOption("mode"),
		"chat.model": () => pickOption("model"),
		"chat.effort": () => pickOption("thought_level"),
		"chat.pageUp": () => view.scroll(-1),
		"chat.pageDown": () => view.scroll(1),
	};
	for (const [command, run] of Object.entries(commands)) {
		panel.commands.register(command, run);
	}

	return {
		composer,
		view,
		providers,
		// Whether the history is in, so an empty one is really empty.
		get read() {
			return sessions.read;
		},
		get shown() {
			return shown;
		},
		get hasChats() {
			return sessions.all.length > 0;
		},
		get title() {
			return shown && chatTitle(shown.transcript);
		},
		// The agent and the options it runs with, as the header shows them.
		get agent() {
			if (shown === undefined) return [];
			return [
				providers.title(shown.provider),
				...optionsSummary(
					shown.transcript.config,
					providers.permissionModes(shown.provider),
				),
			];
		},
		// The pickers the agent's options allow.
		get pickers() {
			return CATEGORIES.flatMap((category) => {
				const option = optionOf(category);
				return option?.choices === undefined
					? []
					: [{ category, name: option.name, label: optionLabel(option) }];
			});
		},
		get starting() {
			return starting;
		},
		get failure() {
			return failure;
		},
		start: (provider: string) => void start(provider),
		newChat,
		// Back to a chat from the choice of an agent.
		back() {
			asking = false;
		},
		pickChat,
		pickOption,
		stop() {
			if (shown) panel.agents.cancel(shown.id).catch(failed);
		},
	};
};

export type ChatPanelController = ReturnType<typeof createChatPanel>;
