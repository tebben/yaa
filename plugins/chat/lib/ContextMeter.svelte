<script lang="ts">
import type { Transcript } from "./transcript.ts";

// How full the agent's context is, with what the session cost when the agent
// reports it.
let { usage }: { usage: NonNullable<Transcript["usage"]> } = $props();

const percent = $derived(Math.round((usage.used / usage.size) * 100));
const detail = $derived(
	[
		`${usage.used.toLocaleString()} of ${usage.size.toLocaleString()} tokens`,
		...(usage.cost
			? [`${usage.cost.amount.toFixed(3)} ${usage.cost.currency}`]
			: []),
	].join(" · "),
);
</script>

<span class="meter" title={detail}>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<circle class="track" cx="8" cy="8" r="6" />
		<circle
			class="used"
			cx="8"
			cy="8"
			r="6"
			pathLength="100"
			stroke-dasharray={`${Math.min(percent, 100)} 100`}
		/>
	</svg>
	{percent}%
</span>

<style>
.meter {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--spacing-1);
	color: var(--color-text-muted);
	font-size: var(--text-xs);
}

svg {
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
	/* The arc starts at the top. */
	transform: rotate(-90deg);
}

circle {
	fill: none;
	stroke-width: 2.5;
}

.track {
	stroke: var(--color-border-strong);
}

.used {
	stroke: var(--color-accent);
}
</style>
