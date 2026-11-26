import type { AuthStatus } from "@yaa/plugin-api";
import * as z from "zod";

// What `claude auth status --json` prints, as far as the provider reads it
// (Claude Code 2.1.332).
const printed = z.object({
	loggedIn: z.boolean(),
	apiProvider: z.string().optional(),
	apiKeySource: z.string().optional(),
	subscriptionType: z.string().optional(),
});

const signedIn = (account?: string): AuthStatus =>
	account === undefined
		? { state: "signed-in" }
		: { state: "signed-in", account };

const readJson = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
};

// Output that cannot be read says nothing about the sign-in. What pays is
// named in the order Claude Code picks it: another cloud, an API key, then
// the subscription.
export const parseAuthStatus = (stdout: string): AuthStatus => {
	const read = printed.safeParse(readJson(stdout));
	if (!read.success) return { state: "unknown" };
	const { loggedIn, apiProvider, apiKeySource, subscriptionType } = read.data;
	// `loggedIn` is about Anthropic's own sign-in only.
	if (apiProvider !== undefined && apiProvider !== "firstParty") {
		return signedIn(`API through ${apiProvider}`);
	}
	if (apiKeySource !== undefined) return signedIn(`API key (${apiKeySource})`);
	if (!loggedIn) return { state: "signed-out", login: "claude auth login" };
	return signedIn(
		subscriptionType === undefined
			? undefined
			: `Subscription (${subscriptionType})`,
	);
};

// `claude --version` prints `2.1.332 (Claude Code)`.
export const parseVersion = (stdout: string): string | undefined =>
	/^\d+\.\d+\.\d+\S*/.exec(stdout.trim())?.[0];
