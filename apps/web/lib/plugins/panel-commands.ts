import type { Disposable } from "@yaa/contracts/protocol";

// The handlers open panels registered for their commands, per worktree: a
// command runs in the open worktree's panel.
export const createPanelCommands = () => {
	const handlers = new Map<string, () => void>();
	const key = (worktree: string, command: string) => `${worktree} ${command}`;

	return {
		register(
			worktree: string,
			command: string,
			handler: () => void,
		): Disposable {
			const id = key(worktree, command);
			// The latest wins: when the grid rebuilds, a panel's successor
			// mounts before the panel is destroyed.
			handlers.set(id, handler);
			return {
				dispose() {
					if (handlers.get(id) === handler) handlers.delete(id);
				},
			};
		},
		// The handler for the command in that worktree, if a panel there has one.
		find(
			worktree: string | undefined,
			command: string,
		): (() => void) | undefined {
			return worktree === undefined
				? undefined
				: handlers.get(key(worktree, command));
		},
	};
};

export type PanelCommands = ReturnType<typeof createPanelCommands>;
