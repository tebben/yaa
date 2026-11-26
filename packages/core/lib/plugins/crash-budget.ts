// How many times the plugin host may crash within a window before the core
// stops restarting it: a host that crashes on every start would otherwise
// fork forever.
export const CRASH_LIMIT = 3;
export const CRASH_WINDOW_MS = 60_000;

// The crash times still inside the window once one more happened at `now`,
// and whether that one used up the budget.
export const recordCrash = (
	crashes: readonly number[],
	now: number,
): { crashes: number[]; exhausted: boolean } => {
	const recent = [...crashes, now].filter((at) => now - at < CRASH_WINDOW_MS);
	return { crashes: recent, exhausted: recent.length >= CRASH_LIMIT };
};
