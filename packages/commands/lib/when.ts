// What the app knows at the moment a key is pressed or the palette opens:
// `panel.kind`, `inputFocus`, `worktree.open`. Plugins add keys under their
// own namespace.
export type ContextValue = string | boolean | undefined;
export type Context = Readonly<Record<string, ContextValue>>;

export type When =
	| { ok: true; test(context: Context): boolean }
	| { ok: false; message: string };

type Test = (context: Context) => boolean;

class WhenSyntaxError extends Error {}

const TOKEN = /\s*(&&|\|\||==|!=|!|\(|\)|'[^']*'|[^\s&|!=()']+)/y;

const tokenize = (text: string): string[] | undefined => {
	const tokens: string[] = [];
	TOKEN.lastIndex = 0;
	while (TOKEN.lastIndex < text.length) {
		if (text.slice(TOKEN.lastIndex).trim() === "") break;
		const match = TOKEN.exec(text);
		if (match?.[1] === undefined) return undefined;
		tokens.push(match[1]);
	}
	return tokens;
};

const OPERATORS = new Set(["&&", "||", "==", "!=", "!", "(", ")"]);
const isWord = (token: string | undefined): token is string =>
	token !== undefined && !OPERATORS.has(token) && !token.startsWith("'");

const truthy = (value: ContextValue) =>
	value === true || (typeof value === "string" && value !== "");

// Recursive descent over: or := and ("||" and)*, and := not ("&&" not)*,
// not := "!" not | "(" or ")" | key (("==" | "!=") value)?
const parse = (tokens: string[]): Test => {
	let at = 0;
	const fail = (expected: string): never => {
		const found = tokens[at];
		throw new WhenSyntaxError(
			found === undefined
				? `Expected ${expected} at the end`
				: `Expected ${expected} before “${found}”`,
		);
	};

	const value = (): string => {
		const token = tokens[at];
		if (token?.startsWith("'")) {
			at++;
			return token.slice(1, -1);
		}
		if (isWord(token)) {
			at++;
			return token;
		}
		return fail("a value");
	};

	const not = (): Test => {
		const token = tokens[at];
		if (token === "!") {
			at++;
			const inner = not();
			return (context) => !inner(context);
		}
		if (token === "(") {
			at++;
			const inner = or();
			if (tokens[at] !== ")") fail("“)”");
			at++;
			return inner;
		}
		if (!isWord(token)) return fail("a context key");
		at++;
		const operator = tokens[at];
		if (operator !== "==" && operator !== "!=") {
			return (context) => truthy(context[token]);
		}
		at++;
		const expected = value();
		const equals: Test = (context) => String(context[token]) === expected;
		return operator === "==" ? equals : (context) => !equals(context);
	};

	const and = (): Test => {
		const parts = [not()];
		while (tokens[at] === "&&") {
			at++;
			parts.push(not());
		}
		return (context) => parts.every((part) => part(context));
	};

	const or = (): Test => {
		const parts = [and()];
		while (tokens[at] === "||") {
			at++;
			parts.push(and());
		}
		return (context) => parts.some((part) => part(context));
	};

	const test = or();
	if (at < tokens.length) fail("“&&” or “||”");
	return test;
};

// Parses a condition such as `panel.kind == terminal && !inputFocus`. A key
// on its own holds when its value is true or a non-empty string.
export const parseWhen = (text: string): When => {
	const tokens = tokenize(text);
	if (tokens === undefined) {
		return { ok: false, message: "Unclosed quote or unexpected character" };
	}
	try {
		return { ok: true, test: parse(tokens) };
	} catch (error) {
		if (error instanceof WhenSyntaxError) {
			return { ok: false, message: error.message };
		}
		throw error;
	}
};
