// `copilot --version` prints `GitHub Copilot CLI 1.0.116.` and a line about
// updates (Copilot CLI 1.0.116).
export const parseVersion = (stdout: string): string | undefined =>
	/^GitHub Copilot CLI (\d+\.\d+\.\d+(?:-[\w.]+)?)/.exec(stdout.trim())?.[1];
