import { defineProtocol } from "@yaa/contracts/protocol";
import { dirEntry, gitChange, gitFiles } from "@yaa/contracts/worktree-files";
import * as z from "zod";

const inWorktree = { worktree: z.string() };
const atPath = { ...inWorktree, path: z.string() };
const done = z.object({});

// What the panel asks of the backend.
export const filesProtocol = defineProtocol({
	requests: {
		// The worktree's files with their changes, `ignored` ones too when
		// asked for. `changed` follows after changes, unless `problem` says why
		// the worktree is not watched.
		list: {
			params: z.object({ ...inWorktree, ignored: z.boolean() }),
			result: gitFiles.extend({
				ignored: z.array(z.string()),
				changes: z.array(gitChange),
				problem: z.string().nullable(),
			}),
		},
		// A folder git does not list the files of.
		readDir: {
			params: z.object(atPath),
			result: z.object({ entries: z.array(dirEntry) }),
		},
		create: { params: z.object(atPath), result: done },
		rename: {
			params: z.object({ ...inWorktree, from: z.string(), to: z.string() }),
			result: done,
		},
		remove: { params: z.object(atPath), result: done },
	},
	events: {
		changed: z.object(inWorktree),
	},
});
