import { parseWhen } from "@yaa/commands/when";
import type { FileProblem } from "@yaa/contracts/file-problem";
import {
	type PluginManifest,
	pluginManifest,
} from "@yaa/contracts/plugin-manifest";
import { issueProblems } from "../settings/issue-problems.ts";
import { parseJson } from "../settings/parse-json.ts";

// A plugin folder as read from disk: its name and its plugin.json, if any.
export type PluginFolder = { folder: string; manifest: string | undefined };

export type PluginProblems = { folder: string; problems: FileProblem[] };

export type ResolvedPlugins = {
	plugins: PluginManifest[];
	// Plugins that were refused, each with why.
	refused: PluginProblems[];
};

const manifestProblems = (
	{ folder, manifest }: PluginFolder,
	taken: {
		commands: Set<string>;
		panels: Set<string>;
		providers: Set<string>;
		ids: Set<string>;
	},
): { manifest: PluginManifest } | { problems: FileProblem[] } => {
	const json = parseJson(manifest);
	if (json.kind === "empty") {
		return { problems: [{ path: [], message: "No plugin.json" }] };
	}
	if (json.kind === "invalid") return { problems: [json.problem] };
	const parsed = pluginManifest.safeParse(json.data);
	if (!parsed.success) return { problems: issueProblems([], parsed.error) };
	const plugin = parsed.data;
	const problems: FileProblem[] = [];
	if (plugin.id !== folder) {
		problems.push({
			path: ["id"],
			message: `Expected the folder's name, ${folder}`,
		});
	}
	if (taken.ids.has(plugin.id)) {
		problems.push({
			path: ["id"],
			message: `Plugin ${plugin.id} is loaded twice`,
		});
	}
	plugin.contributes.commands.forEach(({ id, when }, index) => {
		const at = ["contributes", "commands", index];
		if (taken.commands.has(id)) {
			problems.push({
				path: [...at, "id"],
				message: `Another plugin contributes ${id}`,
			});
		}
		const condition = when === undefined ? undefined : parseWhen(when);
		if (condition?.ok === false) {
			problems.push({ path: [...at, "when"], message: condition.message });
		}
	});
	plugin.contributes.keybindings.forEach(({ when }, index) => {
		const condition = when === undefined ? undefined : parseWhen(when);
		if (condition?.ok === false) {
			problems.push({
				path: ["contributes", "keybindings", index, "when"],
				message: condition.message,
			});
		}
	});
	plugin.contributes.panels.forEach(({ id }, index) => {
		if (taken.panels.has(id)) {
			problems.push({
				path: ["contributes", "panels", index, "id"],
				message: `Another plugin contributes ${id}`,
			});
		}
	});
	plugin.contributes.providers.forEach(({ id }, index) => {
		if (taken.providers.has(id)) {
			problems.push({
				path: ["contributes", "providers", index, "id"],
				message: `Another plugin contributes ${id}`,
			});
		}
	});
	return problems.length > 0 ? { problems } : { manifest: plugin };
};

// Plugin folders to the plugins core loads. A plugin with any problem is
// refused whole, so nothing half-loaded reaches the renderer; the first of
// two plugins that claim the same id, command, panel or provider wins.
export const resolvePlugins = (
	folders: readonly PluginFolder[],
): ResolvedPlugins => {
	const taken = {
		ids: new Set<string>(),
		commands: new Set<string>(),
		panels: new Set<string>(),
		providers: new Set<string>(),
	};
	const plugins: PluginManifest[] = [];
	const refused: PluginProblems[] = [];
	for (const folder of folders) {
		const result = manifestProblems(folder, taken);
		if ("problems" in result) {
			refused.push({ folder: folder.folder, problems: result.problems });
			continue;
		}
		const { manifest } = result;
		taken.ids.add(manifest.id);
		for (const { id } of manifest.contributes.commands) taken.commands.add(id);
		for (const { id } of manifest.contributes.panels) taken.panels.add(id);
		for (const { id } of manifest.contributes.providers) {
			taken.providers.add(id);
		}
		plugins.push(manifest);
	}
	return { plugins, refused };
};
