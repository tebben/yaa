import type { ContextKind, ContextLayer } from "@yaa/contracts/agent-context";
import type { PanelContext, WorktreeAgentContext } from "@yaa/plugin-api/ui";
import { LAYER_CHOICES, type ListedProvider, toggleList } from "./rows.ts";

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

const LISTS: readonly { kind: ContextKind; title: string }[] = [
	{ kind: "mcpServers", title: "MCP servers" },
	{ kind: "skills", title: "Skills" },
];

// The MCP and skills panel: what the worktree's agents would load, and the
// switches at each layer. Call while the component sets up.
export const createMcpSkillsPanel = (panel: PanelContext) => {
	let context = $state.raw<WorktreeAgentContext>();
	let providers = $state.raw<readonly ListedProvider[]>([]);
	let layer = $state<ContextLayer>("worktree");
	let failure = $state<string>();
	const failed = (reason: unknown) => {
		failure = describe(reason);
	};

	panel.agents.providers().then((listed) => {
		providers = listed;
	}, failed);
	const watch = panel.agentContext.watch((read) => {
		context = read;
	}, failed);

	const listsOf = ({ providers: found, toggles }: WorktreeAgentContext) =>
		LISTS.map(({ kind, title }) => ({
			kind,
			title,
			...toggleList(kind, found, providers, toggles, layer),
		}));
	const lists = $derived(context && listsOf(context));

	const set = (kind: ContextKind, name?: string, enabled?: boolean) => {
		failure = undefined;
		panel.agentContext
			.set({
				layer,
				kind,
				...(name === undefined ? {} : { name }),
				...(enabled === undefined ? {} : { enabled }),
			})
			.catch(failed);
	};

	const refresh = () => {
		failure = undefined;
		watch.refresh();
	};
	panel.commands.register("mcp-skills.refresh", refresh);
	panel.commands.register("mcp-skills.layer", () =>
		panel.pick({
			label: "Where to switch",
			placeholder: "Where to switch",
			items: (query) =>
				LAYER_CHOICES.filter(({ label }) =>
					label.toLowerCase().includes(query.toLowerCase()),
				).map(({ value, label }) => ({
					id: value,
					label,
					...(value === layer ? { detail: "current" } : {}),
				})),
			empty: () => "No such choice",
			accept(item) {
				const chosen = LAYER_CHOICES.find(({ value }) => value === item.id);
				if (chosen) layer = chosen.value;
			},
		}),
	);

	return {
		get lists() {
			return lists;
		},
		// The providers that could not list theirs, and why.
		get problems() {
			return (context?.providers ?? []).flatMap((result) =>
				result.found
					? []
					: [
							{
								provider:
									providers.find(({ id }) => id === result.provider)?.title ??
									result.provider,
								problem: result.problem,
							},
						],
			);
		},
		get layer() {
			return layer;
		},
		showLayer(value: string) {
			const chosen = LAYER_CHOICES.find((choice) => choice.value === value);
			if (chosen) layer = chosen.value;
		},
		get failure() {
			return failure;
		},
		set,
		refresh,
	};
};

export type McpSkillsPanel = ReturnType<typeof createMcpSkillsPanel>;
