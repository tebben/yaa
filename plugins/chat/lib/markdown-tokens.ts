import { lexer, type MarkedToken, type Token } from "marked";

// Without extensions, which the chat adds none of, every token is one of
// marked's own.
const known: ReadonlySet<string> = new Set<MarkedToken["type"]>([
	"blockquote",
	"br",
	"checkbox",
	"code",
	"codespan",
	"def",
	"del",
	"em",
	"escape",
	"heading",
	"hr",
	"html",
	"image",
	"link",
	"list",
	"list_item",
	"paragraph",
	"space",
	"strong",
	"table",
	"text",
]);

const isMarked = (token: Token): token is MarkedToken => known.has(token.type);

export const markedTokens = (tokens: readonly Token[]): MarkedToken[] =>
	tokens.filter(isMarked);

// Markdown as tokens, which the components render as elements: no text of an
// agent's ever becomes HTML.
export const parseMarkdown = (text: string): MarkedToken[] =>
	markedTokens(lexer(text));
