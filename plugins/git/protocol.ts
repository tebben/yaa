import { defineProtocol } from "@yaa/contracts/protocol";
import {
	gitAction,
	gitChange,
	gitSection,
} from "@yaa/contracts/worktree-files";
import * as z from "zod";

const inWorktree = { worktree: z.string() };

export const gitProtocol = defineProtocol({
	requests: {
		list: {
			params: z.object(inWorktree),
			result: z.object({
				changes: z.array(gitChange),
				problem: z.string().nullable(),
			}),
		},
		change: {
			params: z.object({
				...inWorktree,
				action: gitAction,
				section: gitSection,
				paths: z.array(z.string()).min(1),
			}),
			result: z.object({}),
		},
		commit: {
			params: z.object({ ...inWorktree, message: z.string().min(1) }),
			result: z.object({}),
		},
	},
	events: { changed: z.object(inWorktree) },
});
