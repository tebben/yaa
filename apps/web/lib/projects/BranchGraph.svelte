<script lang="ts">
import type { WorktreeState } from "@yaa/contracts/worktree-state";
import { stateBadges } from "../worktree-state.ts";

// The gutter of a worktree's row in the branch graph (docs/design/ui.md):
// the project's trunk, which ends at the last row, and a tick to the node.
// The node has the state's colour. The main checkout's is filled, as is a
// done worktree's, and any other is an open ring; one under way pulses.
let {
	last,
	main,
	busy,
	state,
}: { last: boolean; main: boolean; busy: boolean; state: WorktreeState } =
	$props();
const badge = $derived(stateBadges[state]);
const filled = $derived(main || state === "done");
</script>

<svg
	class="h-control w-graph shrink-0 overflow-visible"
	viewBox="0 0 42 26"
	aria-hidden="true"
>
	<path
		class="stroke-border-strong"
		d={last ? "M13.5 0V13.5H29" : "M13.5 0V26M13.5 13.5H29"}
		fill="none"
	/>
	<circle
		class={[filled ? badge.fill : ["fill-none", badge.stroke], busy && "busy"]}
		cx="33"
		cy="13.5"
		r={filled ? 3.5 : 3.25}
		stroke-width="1.5"
	/>
</svg>

<style>
.busy {
	animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
	to {
		opacity: 0.3;
	}
}
</style>
