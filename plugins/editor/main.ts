// The editor plugin's backend: reads and writes a worktree's files for the
// panel, tells it when they change, and keeps its tabs and unsaved text.
import type { Disposable, PluginBackend } from "@yaa/plugin-api";
import * as z from "zod";
import { targetKey } from "./lib/tabs.ts";
import { draft, editorProtocol, tabsState } from "./protocol.ts";

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const NO_TABS = { open: [], active: null, closed: [] };
const oldTabs = z
	.object({
		open: z.array(z.object({ path: z.string(), preview: z.boolean() })),
		active: z.string().nullable(),
		closed: z.array(z.string()),
	})
	.transform(({ open, active, closed }) => ({
		open: open.map(({ path, preview }) => ({
			target: { kind: "file" as const, path },
			preview,
		})),
		active: active === null ? null : targetKey({ kind: "file", path: active }),
		closed: closed.map((path) => ({ kind: "file" as const, path })),
	}));

export const activate: PluginBackend["activate"] = ({
	serve,
	git,
	files,
	storage,
	log,
}) => {
	const watches = new Map<string, Promise<Disposable>>();

	// What is kept under `key`, or `empty` when there is nothing usable.
	const stored = async <T>(
		worktree: string,
		key: string,
		schema: z.ZodType<T>,
		empty: T,
	): Promise<T> => {
		const value = await storage.get(worktree, key);
		if (value === undefined) return empty;
		const parsed = schema.safeParse(value);
		if (parsed.success) return parsed.data;
		log.warn(`stored ${key} could not be read`, {
			worktree,
			error: parsed.error.message,
		});
		return empty;
	};

	const server = serve(editorProtocol, {
		list: async ({ worktree }) => ({
			files: (await git.files(worktree)).files,
		}),
		read: ({ worktree, path }) => files.read(worktree, path),
		readGit: ({ worktree, source, path }) => git.read(worktree, source, path),
		changes: async ({ worktree }) => ({ changes: await git.changes(worktree) }),
		readBytes: ({ worktree, path }) => files.readBytes(worktree, path),
		fetchImage: ({ url }) => files.fetchImage(url),
		write: ({ worktree, path, text, version }) =>
			files.write(worktree, path, text, version),
		async restore({ worktree }) {
			const [tabs, drafts] = await Promise.all([
				stored(worktree, "tabs", z.union([tabsState, oldTabs]), NO_TABS),
				stored(worktree, "drafts", z.array(draft), []),
			]);
			return { tabs, drafts };
		},
		async saveTabs({ worktree, tabs }) {
			await storage.set(worktree, "tabs", tabs);
			return {};
		},
		async saveDrafts({ worktree, drafts }) {
			await storage.set(
				worktree,
				"drafts",
				drafts.length === 0 ? undefined : drafts,
			);
			return {};
		},
		async watch({ worktree }) {
			let watching = watches.get(worktree);
			if (watching === undefined) {
				watching = files.watch(worktree, () =>
					server.emit("changed", { worktree }),
				);
				watches.set(worktree, watching);
			}
			try {
				await watching;
				return { problem: null };
			} catch (error) {
				watches.delete(worktree);
				log.warn("could not watch a worktree", {
					worktree,
					error: describe(error),
				});
				return { problem: `Not updating on changes: ${describe(error)}` };
			}
		},
	});
};
