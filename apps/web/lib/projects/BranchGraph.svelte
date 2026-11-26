<script lang="ts">
// The gutter of a worktree's row in the branch graph (docs/design/ui.md):
// the project's trunk, which ends at the last row, and a tick to the node.
// The main checkout's node is filled, a worktree's an open ring; one under
// way pulses.
let { last, main, busy }: { last: boolean; main: boolean; busy: boolean } =
	$props();
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
		class={[
			main ? "fill-state-idle" : "fill-none stroke-state-idle",
			busy && "busy",
		]}
		cx="33"
		cy="13.5"
		r={main ? 3.5 : 3.25}
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
