// The GitHub Copilot provider (docs/spec/05-agents-chat.md): the user's own
// `copilot` CLI, which speaks ACP itself with `--acp`. Sign-in is the CLI's
// own; yaa stores no credentials.
import type { PluginBackend } from "@yaa/plugin-api";
import { parseVersion } from "./lib/parse-cli.ts";

const MISSING =
	"GitHub Copilot CLI was not found. Install it and make sure `copilot` is on the PATH yaa starts with.";

export const activate: PluginBackend["activate"] = ({
	providers,
	programs,
}) => {
	providers.register("copilot", {
		async detect() {
			const path = await programs.find("copilot");
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
		// The CLI has no command that reports its sign-in, and asking the agent
		// takes seconds. Signed out, it refuses the session with ACP's
		// auth_required, which core turns into how to sign in
		// (docs/decisions/0039-copilot-sign-in-state.md).
		async authStatus() {
			return { state: "unknown" };
		},
		async spawn() {
			const path = await programs.find("copilot");
			if (path === undefined) throw new Error(MISSING);
			return { run: "command", command: path, args: ["--acp"] };
		},
	});
};
