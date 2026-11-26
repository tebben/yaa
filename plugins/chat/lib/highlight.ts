import {
	createCssVariablesTheme,
	createHighlighterCore,
	type HighlighterCore,
	type ThemedToken,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import c from "shiki/langs/c.mjs";
import cpp from "shiki/langs/cpp.mjs";
import csharp from "shiki/langs/csharp.mjs";
import css from "shiki/langs/css.mjs";
import diff from "shiki/langs/diff.mjs";
import dockerfile from "shiki/langs/dockerfile.mjs";
import go from "shiki/langs/go.mjs";
import html from "shiki/langs/html.mjs";
import java from "shiki/langs/java.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsonc from "shiki/langs/jsonc.mjs";
import jsx from "shiki/langs/jsx.mjs";
import kotlin from "shiki/langs/kotlin.mjs";
import markdown from "shiki/langs/markdown.mjs";
import python from "shiki/langs/python.mjs";
import ruby from "shiki/langs/ruby.mjs";
import rust from "shiki/langs/rust.mjs";
import sql from "shiki/langs/sql.mjs";
import svelte from "shiki/langs/svelte.mjs";
import swift from "shiki/langs/swift.mjs";
import toml from "shiki/langs/toml.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import xml from "shiki/langs/xml.mjs";
import yaml from "shiki/langs/yaml.mjs";

export type CodeLines = ThemedToken[][];

const THEME = "yaa";
// Blocks kept highlighted, so one scrolled back into view does not flash.
const CACHED = 200;
// Longer blocks stay plain: highlighting runs on the UI thread.
const LONGEST = 50_000;

const create = () =>
	createHighlighterCore({
		// Colours come out as CSS variables, which CodeBlock maps to tokens.
		themes: [
			createCssVariablesTheme({ name: THEME, variablePrefix: "--yaa-code-" }),
		],
		langs: [
			bash,
			c,
			cpp,
			csharp,
			css,
			diff,
			dockerfile,
			go,
			html,
			java,
			javascript,
			json,
			jsonc,
			jsx,
			kotlin,
			markdown,
			python,
			ruby,
			rust,
			sql,
			svelte,
			swift,
			toml,
			tsx,
			typescript,
			xml,
			yaml,
		],
		// The WebAssembly engine would need the page to compile WebAssembly,
		// which the CSP does not allow.
		engine: createJavaScriptRegexEngine(),
	});

// Made when the first block asks, as are its grammars' patterns.
let highlighter: Promise<HighlighterCore> | undefined;
const cache = new Map<string, Promise<CodeLines | undefined>>();

const tokenize = async (code: string, language: string) => {
	highlighter ??= create();
	const shiki = await highlighter;
	if (!shiki.getLoadedLanguages().includes(language)) return undefined;
	return shiki.codeToTokensBase(code, { lang: language, theme: THEME });
};

// The code's lines as coloured tokens; undefined for a language without a
// grammar here, or a block too long.
export const highlight = (
	code: string,
	language: string,
): Promise<CodeLines | undefined> => {
	if (code.length > LONGEST) return Promise.resolve(undefined);
	const key = `${language}\n${code}`;
	let lines = cache.get(key);
	if (lines === undefined) {
		lines = tokenize(code, language);
		cache.set(key, lines);
		const [oldest] = cache.keys();
		if (cache.size > CACHED && oldest !== undefined) cache.delete(oldest);
	}
	return lines;
};
