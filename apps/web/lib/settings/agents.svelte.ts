import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import type { AgentReport } from "@yaa/contracts/providers";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import type { CoreClient } from "../core-connection.ts";

export type ListedAgent = PluginManifest["contributes"]["providers"][number];

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The agents the loaded plugins provide, and what the last check of each
// found.
export const createAgents = ({
	client,
	manifests,
}: {
	client: CoreClient;
	manifests: Promise<readonly PluginManifest[]>;
}) => {
	let listed = $state.raw<readonly ListedAgent[]>([]);
	const reports = new SvelteMap<string, AgentReport>();
	const checking = new SvelteSet<string>();
	const loaded = manifests.then((plugins) => {
		listed = plugins.flatMap(({ contributes }) => contributes.providers);
	});

	const check = async (id: string) => {
		if (checking.has(id)) return;
		checking.add(id);
		try {
			reports.set(
				id,
				await client.request("providers.inspect", { provider: id }),
			);
		} catch (reason) {
			reports.set(id, { state: "failed", problem: describe(reason) });
		} finally {
			checking.delete(id);
		}
	};

	return {
		get listed() {
			return listed;
		},
		report: (id: string) => reports.get(id),
		checking: (id: string) => checking.has(id),
		check,
		checkAll() {
			loaded.then(
				() => Promise.all(listed.map(({ id }) => check(id))),
				// The plugins report an unreachable core.
				() => undefined,
			);
		},
	};
};

export type AgentsController = ReturnType<typeof createAgents>;
