import type { WorktreeState } from "@yaa/contracts/worktree-state";

// How a worktree's state shows wherever it has a badge: its name, and its
// colour as classes written out so Tailwind finds them.
export const stateBadges: Record<
	WorktreeState,
	{ label: string; text: string; fill: string; stroke: string }
> = {
	attention: {
		label: "Needs attention",
		text: "text-state-attention",
		fill: "fill-state-attention",
		stroke: "stroke-state-attention",
	},
	error: {
		label: "Error",
		text: "text-state-error",
		fill: "fill-state-error",
		stroke: "stroke-state-error",
	},
	running: {
		label: "Running",
		text: "text-state-running",
		fill: "fill-state-running",
		stroke: "stroke-state-running",
	},
	done: {
		label: "Done",
		text: "text-state-done",
		fill: "fill-state-done",
		stroke: "stroke-state-done",
	},
	idle: {
		label: "Idle",
		text: "text-state-idle",
		fill: "fill-state-idle",
		stroke: "stroke-state-idle",
	},
};
