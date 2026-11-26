import type { Port } from "../protocol.ts";

// Two connected in-memory ports. Delivery is asynchronous and cloned, like a
// real MessagePort, so tests see the same ordering and copying.
export const createPortPair = (): [Port, Port] => {
	const ends = [0, 1].map(() => ({
		messageListeners: new Set<(message: unknown) => void>(),
		closeListeners: new Set<() => void>(),
	}));
	let open = true;
	const close = () => {
		if (!open) return;
		open = false;
		queueMicrotask(() => {
			for (const end of ends)
				for (const listener of end.closeListeners) listener();
		});
	};
	const port = (self: number): Port => ({
		postMessage(message) {
			if (!open) return;
			const copy = structuredClone(message);
			const target = ends[1 - self];
			queueMicrotask(() => {
				if (!open) return;
				for (const listener of target?.messageListeners ?? []) listener(copy);
			});
		},
		onMessage(listener) {
			ends[self]?.messageListeners.add(listener);
		},
		onClose(listener) {
			ends[self]?.closeListeners.add(listener);
		},
		close,
	});
	return [port(0), port(1)];
};
