// Runs tasks one at a time per key, in the order they were queued; tasks
// under different keys run side by side. A failed task fails only its own
// caller: the next one still runs.
export type KeyedQueue = {
	run<T>(key: string, task: () => Promise<T>): Promise<T>;
};

export const createKeyedQueue = (): KeyedQueue => {
	// The last task queued under each key, settled either way.
	const tails = new Map<string, Promise<void>>();
	return {
		run(key, task) {
			const result = (tails.get(key) ?? Promise.resolve()).then(task);
			const tail = result.then(
				() => undefined,
				() => undefined,
			);
			tails.set(key, tail);
			void tail.then(() => {
				if (tails.get(key) === tail) tails.delete(key);
			});
			return result;
		},
	};
};
