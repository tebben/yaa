import { cssVariables } from "./lib/tokens/css-variables.ts";
import { themeCss, tokensTs } from "./lib/tokens/render-token-files.ts";
import { tokenFile } from "./lib/tokens/token-file.ts";

// The files generated from docs/design/tokens.json, by their path in this
// package. Throws when the tokens do not match the expected shape.
export const generateTokenFiles = (json: unknown): Record<string, string> => {
	const variables = cssVariables(tokenFile.parse(json));
	return {
		"theme.css": themeCss(variables),
		"tokens.ts": tokensTs(variables),
	};
};
