import { describe, expect, it } from "vitest";
import {
	applyPermissionMode,
	currentPermissionMode,
} from "../permission-modes.ts";

const mapping = {
	option: "mode",
	values: {
		ask: ["default"],
		risky: ["auto", "acceptEdits"],
		allow: ["bypassPermissions"],
	},
};

const modeOption = (value: string, offered: string[]) => ({
	id: "mode",
	value,
	choices: offered.map((choice) => ({ value: choice })),
});

const model = { id: "model", value: "opus" };

describe("applyPermissionMode", () => {
	it("sets the first value the agent offers", () => {
		const all = ["default", "acceptEdits", "plan", "auto", "bypassPermissions"];
		expect(
			applyPermissionMode(mapping, "risky", [
				model,
				modeOption("default", all),
			]),
		).toEqual({ action: "set", value: "auto" });
		expect(
			applyPermissionMode(mapping, "risky", [
				modeOption("default", ["default", "acceptEdits", "plan"]),
			]),
		).toEqual({ action: "set", value: "acceptEdits" });
	});

	it("keeps a value that already means the mode", () => {
		expect(
			applyPermissionMode(mapping, "risky", [
				modeOption("acceptEdits", ["default", "acceptEdits", "auto"]),
			]),
		).toEqual({ action: "keep" });
	});

	it("leaves the mode the agent cannot take as missing", () => {
		expect(
			applyPermissionMode(mapping, "allow", [
				modeOption("default", ["default", "plan"]),
			]),
		).toEqual({ action: "missing" });
		expect(applyPermissionMode(mapping, "ask", [model])).toEqual({
			action: "missing",
		});
	});
});

describe("currentPermissionMode", () => {
	it("reads the mode the agent's value means", () => {
		expect(
			currentPermissionMode(mapping, [modeOption("acceptEdits", [])]),
		).toBe("risky");
		expect(
			currentPermissionMode(mapping, [modeOption("bypassPermissions", [])]),
		).toBe("allow");
	});

	it("has none for a mode of the agent's own or no option", () => {
		expect(currentPermissionMode(mapping, [modeOption("plan", [])])).toBe(
			undefined,
		);
		expect(currentPermissionMode(mapping, [model])).toBe(undefined);
	});
});
