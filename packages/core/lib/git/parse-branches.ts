// Reads `git for-each-ref --format=%(refname) refs/heads refs/remotes`:
// local branches by name, and remote ones as `<remote>/<branch>` without
// each remote's HEAD, which only points at one of the others.
export const parseBranches = (
	output: string,
): { local: string[]; remote: string[] } => {
	const local: string[] = [];
	const remote: string[] = [];
	for (const ref of output.split("\n")) {
		if (ref.startsWith("refs/heads/")) local.push(ref.slice(11));
		else if (ref.startsWith("refs/remotes/") && !ref.endsWith("/HEAD")) {
			remote.push(ref.slice(13));
		}
	}
	return { local: local.sort(), remote: remote.sort() };
};
