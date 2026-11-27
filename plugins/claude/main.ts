// The Claude Code provider (docs/spec/05-agents-chat.md): the user's own
// `claude` CLI, run over ACP through the adapter in this plugin's agent
// module. Sign-in is the CLI's own; yaa stores no credentials.
import type { PluginBackend } from "@yaa/plugin-api";
import { discover } from "./lib/discover.ts";
import { parseAuthStatus, parseVersion } from "./lib/parse-cli.ts";
import { sessionMeta } from "./lib/session-meta.ts";

const MISSING =
	"Claude Code was not found. Install it and make sure `claude` is on the PATH yaa starts with.";

export const activate: PluginBackend["activate"] = ({
	providers,
	programs,
	userFiles,
}) => {
	const installed = async () => {
		const path = await programs.find("claude");
		if (path === undefined) throw new Error(MISSING);
		return path;
	};

	providers.register("claude", {
		async detect() {
			const path = await programs.find("claude");
			if (path === undefined) return { installed: false, problem: MISSING };
			const { code, stdout, stderr } = await programs.run(path, ["--version"]);
			const version = parseVersion(stdout);
			return code === 0 && version !== undefined
				? { installed: true, version }
				: {
						installed: false,
						problem: `\`${path} --version\` failed: ${stderr || stdout}`,
					};
		},
		async authStatus() {
			// Signed out exits with 1 and still prints the status.
			const { stdout } = await programs.run(await installed(), [
				"auth",
				"status",
				"--json",
			]);
			return parseAuthStatus(stdout);
		},
		discover: (session) => discover(userFiles, session),
		async spawn({ off }) {
			const meta = sessionMeta(off);
			return {
				run: "module",
				// The adapter starts this CLI, not one of its own.
				env: { CLAUDE_CODE_EXECUTABLE: await installed() },
				...(meta === undefined ? {} : { sessionMeta: meta }),
			};
		},
	});
};
