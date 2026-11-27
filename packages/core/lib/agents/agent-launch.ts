// The command that starts an agent process, which speaks ACP on its stdio.
export type AgentLaunch = {
	command: string;
	args: string[];
	// Added to core's own environment.
	env: Record<string, string>;
	// Not for the process: sent as `_meta` with the ACP request that opens or
	// resumes the session.
	sessionMeta?: Record<string, unknown>;
};

// Runs a script with Electron's binary in Node mode. The variable that
// turns that mode on is taken out again before the script runs, so what the
// agent starts, an Electron app included, does not inherit it.
export const nodeLaunch = (
	script: string,
	args: string[],
	env: Record<string, string>,
): AgentLaunch => ({
	command: process.execPath,
	args: [
		"--import",
		"data:text/javascript,delete process.env.ELECTRON_RUN_AS_NODE",
		script,
		...args,
	],
	env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
});
