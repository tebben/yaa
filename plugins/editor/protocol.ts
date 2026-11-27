import { defineProtocol } from "@yaa/contracts/protocol";
import {
	editorTarget,
	fileBytes,
	fileContent,
	fileWrite,
	gitChange,
	gitSource,
	remoteImage,
} from "@yaa/contracts/worktree-files";
import * as z from "zod";

const inWorktree = { worktree: z.string() };
const atPath = { ...inWorktree, path: z.string() };
const done = z.object({});

// A worktree's tabs, left to right. The one preview tab is reused by the next
// file opened. `closed` holds the paths to reopen, the latest last.
export const tabsState = z.object({
	open: z.array(z.object({ target: editorTarget, preview: z.boolean() })),
	active: z.string().nullable(),
	closed: z.array(editorTarget),
});

// A file's unsaved text, and the version on disk it was made from.
export const draft = z.object({
	path: z.string(),
	text: z.string(),
	version: z.string().nullable(),
});

// What the panel asks of the backend.
export const editorProtocol = defineProtocol({
	requests: {
		// The worktree's files, to pick one from.
		list: {
			params: z.object(inWorktree),
			result: z.object({ files: z.array(z.string()) }),
		},
		read: { params: z.object(atPath), result: fileContent },
		readGit: {
			params: z.object({ ...atPath, source: gitSource }),
			result: fileContent,
		},
		changes: {
			params: z.object(inWorktree),
			result: z.object({ changes: z.array(gitChange) }),
		},
		readBytes: { params: z.object(atPath), result: fileBytes },
		fetchImage: {
			params: z.object({ url: z.string().url() }),
			result: remoteImage,
		},
		write: {
			params: z.object({
				...atPath,
				text: z.string(),
				version: z.string().nullable(),
			}),
			result: fileWrite,
		},
		// What was open in the worktree.
		restore: {
			params: z.object(inWorktree),
			result: z.object({ tabs: tabsState, drafts: z.array(draft) }),
		},
		saveTabs: {
			params: z.object({ ...inWorktree, tabs: tabsState }),
			result: done,
		},
		saveDrafts: {
			params: z.object({ ...inWorktree, drafts: z.array(draft) }),
			result: done,
		},
		// `changed` follows after changes in the worktree, unless `problem` says
		// why it is not watched.
		watch: {
			params: z.object(inWorktree),
			result: z.object({ problem: z.string().nullable() }),
		},
	},
	events: {
		changed: z.object(inWorktree),
	},
});

export type TabsState = z.infer<typeof tabsState>;
export type Draft = z.infer<typeof draft>;
