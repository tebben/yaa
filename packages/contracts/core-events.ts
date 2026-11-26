import * as z from "zod";

// Events the core writes to its event log. State such as a worktree's is
// derived from them (docs/spec/02-worktrees.md), so each one has a schema and
// is checked on its way into and out of the database. Removing or changing an
// event needs a migration of the rows already stored.
export const coreEvent = z.discriminatedUnion("type", [
	z.object({ type: z.literal("core.started"), pid: z.number().int() }),
]);

export type CoreEvent = z.infer<typeof coreEvent>;
