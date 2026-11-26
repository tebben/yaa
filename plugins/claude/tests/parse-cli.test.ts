import { describe, expect, it } from "vitest";
import { parseAuthStatus, parseVersion } from "../cli.ts";

const status = (fields: object) =>
	parseAuthStatus(
		JSON.stringify({ loggedIn: true, apiProvider: "firstParty", ...fields }),
	);

describe("parseAuthStatus", () => {
	it("names the subscription that pays", () => {
		expect(status({ subscriptionType: "pro" })).toEqual({
			state: "signed-in",
			account: "Subscription (pro)",
		});
	});

	it("puts an API key before a stored subscription", () => {
		expect(
			status({
				apiKeySource: "ANTHROPIC_API_KEY",
				subscriptionType: "pro",
			}),
		).toEqual({
			state: "signed-in",
			account: "API key (ANTHROPIC_API_KEY)",
		});
	});

	it("says how to sign in when signed out", () => {
		expect(status({ loggedIn: false })).toEqual({
			state: "signed-out",
			login: "claude auth login",
		});
	});

	it("takes another cloud as signed in without Anthropic's sign-in", () => {
		expect(status({ loggedIn: false, apiProvider: "bedrock" })).toEqual({
			state: "signed-in",
			account: "API through bedrock",
		});
	});

	it("does not know from output it cannot read", () => {
		expect(parseAuthStatus("Not a command")).toEqual({ state: "unknown" });
		expect(parseAuthStatus("{}")).toEqual({ state: "unknown" });
	});
});

describe("parseVersion", () => {
	it("reads the version before the product name", () => {
		expect(parseVersion("2.1.332 (Claude Code)\n")).toBe("2.1.332");
		expect(parseVersion("command not found")).toBeUndefined();
	});
});
