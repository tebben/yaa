import type { ChildProcess } from "node:child_process";

// How long a stopped process gets to end before it is killed.
export const KILL_AFTER_MS = 5000;

// Signals a child started with `detached`, and everything it started that
// stayed in its process group.
export const signalGroup = (child: ChildProcess, signal: NodeJS.Signals) => {
	if (child.pid === undefined) return;
	try {
		process.kill(-child.pid, signal);
	} catch (error) {
		// The group has ended already.
		if (!(error instanceof Error && "code" in error)) throw error;
		if (error.code !== "ESRCH") throw error;
	}
};
