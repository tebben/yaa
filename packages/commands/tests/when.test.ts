import { describe, expect, it } from "vitest";
import { type Context, parseWhen } from "../when.ts";

const holds = (text: string, context: Context) => {
	const when = parseWhen(text);
	if (!when.ok) throw new Error(when.message);
	return when.test(context);
};

describe("parseWhen", () => {
	it("tests a key on its own by truthiness", () => {
		expect(holds("inputFocus", { inputFocus: true })).toBe(true);
		expect(holds("inputFocus", { inputFocus: false })).toBe(false);
		expect(holds("panel.kind", { "panel.kind": "chat" })).toBe(true);
		expect(holds("panel.kind", {})).toBe(false);
	});

	it("compares with == and != against bare or quoted values", () => {
		const context = { "panel.kind": "terminal", "palette.open": true };
		expect(holds("panel.kind == terminal", context)).toBe(true);
		expect(holds("panel.kind == 'chat'", context)).toBe(false);
		expect(holds("panel.kind != chat", context)).toBe(true);
		expect(holds("palette.open == true", context)).toBe(true);
	});

	it("combines with !, && before ||, and parentheses", () => {
		const context = { a: true, b: false, c: true };
		expect(holds("!b && a", context)).toBe(true);
		expect(holds("b && a || c", context)).toBe(true);
		expect(holds("b && (a || c)", context)).toBe(false);
		expect(holds("!(a && c)", context)).toBe(false);
	});

	it("rejects malformed conditions with a message", () => {
		for (const text of ["a &&", "a == ", "(a", "a b", "a = b", "'a", "&&"]) {
			const when = parseWhen(text);
			expect(when.ok, text).toBe(false);
		}
	});
});
