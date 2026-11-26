import { createDock, type DockController, type PanelKind } from "@yaa/ui/dock";
import { SvelteMap } from "svelte/reactivity";
import type { CoreClient } from "./core-connection.ts";
import { defaultLayout } from "./panels/index.ts";

// Dragging a sash changes the layout on every frame; save once it settles.
const SAVE_DELAY_MS = 500;

type LayoutOptions = {
	client: CoreClient;
	// Every panel kind, the plugins' included.
	kinds: Promise<ReadonlyMap<string, PanelKind>>;
	fail(reason: unknown): void;
};

// One dock grid per worktree, each with its own saved layout
// (docs/spec/02-worktrees.md). A worktree's dock is created the first time
// it opens and kept while the app runs, so switching back finds its panels
// as they were.
export const createLayouts = ({ client, kinds, fail }: LayoutOptions) => {
	const docks = new SvelteMap<string, DockController>();
	const loading = new Set<string>();
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
	let available = $state.raw<ReadonlyMap<string, PanelKind>>(new Map());
	kinds.then((all) => {
		available = all;
	}, fail);

	const save = (worktree: string, layout: string) => {
		clearTimeout(timers.get(worktree));
		timers.set(
			worktree,
			setTimeout(() => {
				timers.delete(worktree);
				client.request("layout.save", { worktree, layout }).catch(fail);
			}, SAVE_DELAY_MS),
		);
	};

	return {
		// Created docks by worktree id.
		get docks(): ReadonlyMap<string, DockController> {
			return docks;
		},
		// Every panel kind; empty until the plugins have answered.
		get kinds() {
			return available;
		},
		// Loads the worktree's layout and makes its dock, once.
		open(worktree: string) {
			if (docks.has(worktree) || loading.has(worktree)) return;
			loading.add(worktree);
			Promise.all([client.request("layout.get", { worktree }), kinds])
				.then(([{ layout }, all]) => {
					docks.set(
						worktree,
						createDock({
							kinds: all,
							layout: layout ?? undefined,
							defaultLayout,
							onChange: (changed) => save(worktree, changed),
						}),
					);
				}, fail)
				.finally(() => loading.delete(worktree));
		},
		// Drops the docks of worktrees that are gone, with any save still to
		// come: core dropped their layouts with them.
		keep(worktrees: ReadonlySet<string>) {
			for (const id of [...docks.keys(), ...timers.keys()]) {
				if (worktrees.has(id)) continue;
				docks.delete(id);
				clearTimeout(timers.get(id));
				timers.delete(id);
			}
		},
	};
};

export type LayoutsController = ReturnType<typeof createLayouts>;
