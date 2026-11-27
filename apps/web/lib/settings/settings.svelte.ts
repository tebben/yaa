import Bot from "@lucide/svelte/icons/bot";
import FolderGit2 from "@lucide/svelte/icons/folder-git-2";
import Keyboard from "@lucide/svelte/icons/keyboard";
import Palette from "@lucide/svelte/icons/palette";
import Search from "@lucide/svelte/icons/search";
import Settings from "@lucide/svelte/icons/settings";
import { pluginFileUrl } from "@yaa/contracts/app-urls";
import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import type { Disposable } from "@yaa/contracts/protocol";
import {
	coreSettings,
	coreSettingsSections,
	type SettingsState,
} from "@yaa/contracts/settings";
import type { IconSource } from "@yaa/ui";
import { SvelteMap } from "svelte/reactivity";
import * as z from "zod";
import type { CoreClient } from "../core-connection.ts";
import type { Crumb } from "../shell/crumb.ts";
import { createAgents } from "./agents.svelte.ts";
import { appearanceVariables } from "./appearance.ts";
import {
	agentsPage,
	corePages,
	pluginPages,
	type SettingsPage,
	searchSettings,
} from "./settings-pages.ts";

export type SettingsValues = Readonly<Record<string, unknown>>;

type SettingsOptions = {
	client: CoreClient;
	manifests: Promise<readonly PluginManifest[]>;
	report(message: string): void;
	// Runs after the appearance settings changed the tokens, for what reads
	// them once, such as the dock grid's gaps.
	restyle(): void;
};

const appearance = z.object(coreSettings).pick({
	"appearance.customAccent": true,
	"appearance.accent": true,
	"appearance.textSize": true,
	"appearance.uiFont": true,
	"appearance.codeFont": true,
	"appearance.panelGap": true,
	"appearance.panelRadius": true,
	"appearance.focusEdge": true,
	"appearance.menuWidth": true,
});

const coreIcons: Record<string, IconSource> = {
	agents: Bot,
	appearance: Palette,
	worktrees: FolderGit2,
	keyboard: Keyboard,
};

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The settings: what settings.json resolves to, with the changes on their
// way to it, applied to the page's tokens and handed to plugin panels; and
// the settings screen, its pages and its search
// (docs/spec/11-platform-services.md).
export const createSettings = ({
	client,
	manifests,
	report,
	restyle,
}: SettingsOptions) => {
	let state = $state<SettingsState>();
	// Changes sent to core, shown until core has written them, and colours
	// previewed while the picker moves.
	const pending = new SvelteMap<string, unknown>();
	const values = $derived<SettingsValues | undefined>(
		state && { ...state.values, ...Object.fromEntries(pending) },
	);
	const listeners = new Set<(values: SettingsValues) => void>();
	// The variables set the last time, to take out the ones no longer set.
	let applied: readonly string[] = [];

	const apply = () => {
		if (values === undefined) return;
		const root = document.documentElement;
		const variables = appearanceVariables(appearance.parse(values));
		for (const name of applied) {
			if (!(name in variables)) root.style.removeProperty(`--${name}`);
		}
		for (const [name, value] of Object.entries(variables)) {
			root.style.setProperty(`--${name}`, value);
		}
		applied = Object.keys(variables);
		restyle();
		for (const listener of listeners) listener(values);
	};
	const take = (next: SettingsState) => {
		state = next;
		apply();
	};
	// Plugin panels render once this is in, so a panel's `watch` hears the
	// settings before the panel shows.
	const loaded = client.request("settings.get", {}).then(take);
	loaded.catch((reason: unknown) => {
		report(`Settings unreadable: ${describe(reason)}`);
	});
	client.subscribe("settings.changed", take);

	let pages = $state<readonly SettingsPage[]>([
		...corePages(coreSettingsSections, coreSettings),
		agentsPage,
	]);
	const agents = createAgents({ client, manifests });
	manifests.then(
		(plugins) => {
			pages = [...pages, ...pluginPages(plugins)];
		},
		// The plugins report an unreachable core.
		() => undefined,
	);
	let open = $state(false);
	let pageId = $state("appearance");
	let query = $state("");
	const page = $derived(pages.find(({ id }) => id === pageId) ?? pages[0]);
	const iconOf = (page: SettingsPage): IconSource =>
		page.plugin === undefined
			? (coreIcons[page.id] ?? Settings)
			: page.plugin.icon === undefined
				? Settings
				: pluginFileUrl(page.plugin.id, page.plugin.icon);

	return {
		agents,
		loaded,
		get values() {
			return values;
		},
		get problems() {
			return state?.problems ?? [];
		},
		get pages() {
			return pages;
		},
		get page() {
			return page;
		},
		// The pages the screen shows: the chosen one, or what the search found.
		get shown(): readonly SettingsPage[] {
			if (query.trim() !== "") return searchSettings(pages, query);
			return page === undefined ? [] : [page];
		},
		get query() {
			return query;
		},
		set query(text: string) {
			query = text;
		},
		iconOf,
		get open() {
			return open;
		},
		show(id?: string) {
			if (id !== undefined) pageId = id;
			query = "";
			open = true;
		},
		close() {
			open = false;
		},
		// The header's path while the screen is open.
		get crumbs(): Crumb[] {
			const root = { icon: Settings, label: "Settings" };
			if (query.trim() !== "") return [root, { icon: Search, label: "Search" }];
			return page === undefined
				? [root]
				: [root, { icon: iconOf(page), label: page.title }];
		},
		// Writes a setting; the page shows it at once.
		set(key: string, value: unknown) {
			pending.set(key, value);
			apply();
			// Core sends the written file's state before it answers, so the
			// change is in `state` by the time it leaves `pending`. A later
			// change to the same setting stays until its own answer.
			const settled = () => {
				if (pending.get(key) !== value) return;
				pending.delete(key);
				apply();
			};
			client
				.request("settings.set", { key, value })
				.then(settled, (reason: unknown) => {
					settled();
					report(`Setting not saved: ${describe(reason)}`);
				});
		},
		// Shows a value without writing it, such as a colour while it is picked.
		preview(key: string, value: unknown) {
			pending.set(key, value);
			apply();
		},
		// Calls `listener` with every setting's value, now when they are read
		// and after each change.
		watch(listener: (values: SettingsValues) => void): Disposable {
			listeners.add(listener);
			if (values !== undefined) listener(values);
			return { dispose: () => listeners.delete(listener) };
		},
	};
};

export type SettingsController = ReturnType<typeof createSettings>;
