import { describe, expect, it } from "vitest";
import { parseVersion } from "../cli.ts";

describe("parseVersion", () => {
	it("reads the version without the sentence's full stop", () => {
		expect(
			parseVersion(
				"GitHub Copilot CLI 1.0.116.\nRun 'copilot update' to check for updates.\n",
			),
		).toBe("1.0.116");
		expect(parseVersion("command not found")).toBeUndefined();
	});
});
