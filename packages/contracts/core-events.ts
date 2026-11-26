import * as z from "zod";

// A worktree's setup after it is created, or its teardown before its folder
// is removed.
export const stepPhase = z.enum(["setup", "teardown"]);

const stepRun = { worktree: z.string(), phase: stepPhase };

// Events the core writes to its event log. State such as a worktree's is
// derived from them (docs/spec/02-worktrees.md), so each one has a schema and
// is checked on its way into and out of the database. Removing or changing an
// event needs a migration of the rows already stored.
export const coreEvent = z.discriminatedUnion("type", [
	z.object({ type: z.literal("core.started"), pid: z.number().int() }),
	z.object({ type: z.literal("worktree.steps.started"), ...stepRun }),
	z.object({ type: z.literal("worktree.steps.succeeded"), ...stepRun }),
	// `step` is the command, or what else failed; `output` its last lines.
	z.object({
		type: z.literal("worktree.steps.failed"),
		...stepRun,
		step: z.string(),
		reason: z.string(),
		output: z.array(z.string()),
	}),
]);

export type CoreEvent = z.infer<typeof coreEvent>;
export type StepPhase = z.infer<typeof stepPhase>;
