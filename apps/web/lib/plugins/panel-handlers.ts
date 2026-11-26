import type { Disposable } from "@yaa/contracts/protocol";

// The handlers open panels registered, per worktree and name, such as for a
// command. What is delivered to a panel that is not there yet waits for it,
// the latest only.
export const createPanelHandlers = <T>() => {
	const handlers = new Map<string, (value: T) => void>();
	const waiting = new Map<string, { value: T }>();
	const key = (worktree: string, name: string) => `${worktree} ${name}`;

	return {
		register(
			worktree: string,
			name: string,
			handler: (value: T) => void,
		): Disposable {
			const id = key(worktree, name);
			// The latest wins: when the grid rebuilds, a panel's successor
			// mounts before the panel is destroyed.
			handlers.set(id, handler);
			const pending = waiting.get(id);
			if (pending !== undefined) {
				waiting.delete(id);
				handler(pending.value);
			}
			return {
				dispose() {
					if (handlers.get(id) === handler) handlers.delete(id);
				},
			};
		},
		// Whether a panel there handles the name now.
		handles(worktree: string, name: string) {
			return handlers.has(key(worktree, name));
		},
		deliver(worktree: string, name: string, value: T) {
			const id = key(worktree, name);
			const handler = handlers.get(id);
			if (handler === undefined) waiting.set(id, { value });
			else handler(value);
		},
	};
};

export type PanelHandlers<T> = ReturnType<typeof createPanelHandlers<T>>;
