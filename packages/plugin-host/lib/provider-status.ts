import {
	authStatus,
	detection,
	type ProviderStatus,
} from "@yaa/contracts/providers";
import type { AgentProvider } from "@yaa/plugin-api";

// Whether a chat can start with a provider: its agent installed, and not
// known to be signed out. What the plugin returns is checked here.
export const providerStatusOf = async (
	provider: AgentProvider,
): Promise<ProviderStatus> => {
	const found = detection.parse(await provider.detect());
	if (!found.installed) return { state: "missing", problem: found.problem };
	const { version } = found;
	const auth = authStatus.parse(await provider.authStatus());
	if (auth.state === "signed-out") {
		return { state: "signed-out", version, login: auth.login };
	}
	return auth.state === "signed-in" && auth.account !== undefined
		? { state: "ready", version, account: auth.account }
		: { state: "ready", version };
};
