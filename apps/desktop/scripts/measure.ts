// The smoke test's timings, taken in the page, where input and frames are
// (docs/spec/12-stack-packaging.md).
import { z } from "zod";
import { type Connection, evaluate } from "./cdp.ts";

// From the event of the key `press` sends to the frame after the condition
// first holds, so its paint is included. The listeners go in before the key
// is sent: input reaches the page through the browser process, so it can
// overtake an expression still being evaluated. The app's own key listener
// runs first, and the page may change before this one has seen the key, so
// the key's time is read only once the frame is due.
export const keyToPaintMs = async (
	page: Connection,
	condition: string,
	press: () => Promise<void>,
): Promise<number> => {
	await evaluate(
		page,
		`void (globalThis.painted = new Promise((resolve) => {
			let pressedAt;
			addEventListener("keydown", (event) => { pressedAt = event.timeStamp; }, { capture: true, once: true });
			const observer = new MutationObserver(() => {
				if (!(${condition})) return;
				observer.disconnect();
				requestAnimationFrame(() => setTimeout(() => resolve(performance.now() - pressedAt)));
			});
			observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
		}))`,
		z.undefined(),
	);
	await press();
	return evaluate(page, "globalThis.painted", z.number());
};

// The times between the frames from the one where `started` first holds to
// the one where `ended` does, while `start` sets off what they show.
export const frameGapsDuring = async (
	page: Connection,
	{ started, ended }: { started: string; ended: string },
	start: () => Promise<void>,
): Promise<number[]> => {
	await evaluate(
		page,
		`void (globalThis.frameGaps = new Promise((resolve) => {
			const gaps = [];
			let last;
			const frame = (now) => {
				if (last !== undefined) {
					gaps.push(now - last);
					if (${ended}) return resolve(gaps);
				}
				if (last !== undefined || (${started})) last = now;
				requestAnimationFrame(frame);
			};
			requestAnimationFrame(frame);
		}))`,
		z.undefined(),
	);
	await start();
	return evaluate(page, "globalThis.frameGaps", z.array(z.number()).min(1));
};

export const median = (values: readonly number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
};

export const reportTime = (name: string, ms: number, targetMs: number) =>
	console.log(
		`${name}: ${Math.round(ms)} ms (target ${targetMs} ms${ms > targetMs ? ", over" : ""})`,
	);

// A frame is dropped for each frame period, the median gap, that passed
// without one.
export const reportFrames = (name: string, gaps: readonly number[]) => {
	const period = median(gaps);
	const dropped = gaps.reduce(
		(sum, gap) => sum + Math.max(0, Math.round(gap / period) - 1),
		0,
	);
	console.log(
		`${name}: ${dropped} dropped of ${gaps.length + dropped} frames at ${period.toFixed(1)} ms, longest ${Math.round(Math.max(...gaps))} ms (target none dropped${dropped > 0 ? ", over" : ""})`,
	);
};
