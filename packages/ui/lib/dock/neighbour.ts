import type { DockDirection } from "./dock.svelte.ts";

// The box of a group in the grid, in page pixels.
export type Box = { left: number; top: number; right: number; bottom: number };

// Sashes and rounding leave neighbours a fraction of a pixel apart.
const TOLERANCE = 1;

const overlap = (startA: number, endA: number, startB: number, endB: number) =>
	Math.min(endA, endB) - Math.max(startA, startB);

// The index of the box beside `from` in the direction: one that lies past
// that edge and shares some of its length, the nearest first, then the one
// sharing most. Undefined at the grid's edge. A wide panel under two
// narrower ones finds one of them, which comparing centres would not.
export const neighbour = (
	from: Box,
	boxes: readonly Box[],
	direction: DockDirection,
): number | undefined => {
	const horizontal = direction === "left" || direction === "right";
	let best: { index: number; gap: number; shared: number } | undefined;
	for (const [index, box] of boxes.entries()) {
		const gap = {
			left: from.left - box.right,
			right: box.left - from.right,
			up: from.top - box.bottom,
			down: box.top - from.bottom,
		}[direction];
		const shared = horizontal
			? overlap(from.top, from.bottom, box.top, box.bottom)
			: overlap(from.left, from.right, box.left, box.right);
		if (gap < -TOLERANCE || shared <= TOLERANCE) continue;
		if (
			best === undefined ||
			gap < best.gap - TOLERANCE ||
			(gap <= best.gap + TOLERANCE && shared > best.shared)
		) {
			best = { index, gap, shared };
		}
	}
	return best?.index;
};
