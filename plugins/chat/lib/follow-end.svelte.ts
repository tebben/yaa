import { tick } from "svelte";
import type { VListHandle } from "virtua/svelte";

// How close to the end, in pixels, still counts as at the end.
const SLACK = 24;
// The share of the viewport one page step scrolls.
const PAGE = 0.8;

// Keeps a virtual list at its end as items arrive and grow, until it is
// scrolled away from there. Call while the component sets up.
export const followEnd = (
	list: () => VListHandle | undefined,
	items: () => readonly unknown[],
) => {
	let atEnd = true;
	const toEnd = () => {
		if (atEnd) list()?.scrollToIndex(items().length - 1, { align: "end" });
	};
	$effect(() => {
		items();
		list();
		// After the list has the new items.
		void tick().then(toEnd);
	});
	return {
		toEnd,
		scrolled(offset: number) {
			const shown = list();
			if (shown === undefined) return;
			atEnd = offset + shown.getViewportSize() >= shown.getScrollSize() - SLACK;
		},
		page(pages: number) {
			const shown = list();
			shown?.scrollBy(pages * PAGE * shown.getViewportSize());
		},
	};
};
