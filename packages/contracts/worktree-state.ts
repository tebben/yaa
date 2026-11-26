import * as z from "zod";

// What a worktree, or one source in it such as a chat, is doing, from the
// highest to the lowest: a worktree shows the highest state of its sources
// (docs/spec/02-worktrees.md). The names are those of the state colour
// tokens.
export const worktreeState = z.enum([
	"attention",
	"error",
	"running",
	"done",
	"idle",
]);

export type WorktreeState = z.infer<typeof worktreeState>;
