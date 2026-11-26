import * as z from "zod";
import { fileProblem } from "./file-problem.ts";

// Lower-case modifiers, then a key name, joined by `+`: `ctrl+shift+p`.
const key = z
	.string()
	.regex(
		/^(?:(?:ctrl|shift|alt|meta)\+)*[^\s+A-Z]+$/,
		"Expected lower-case modifiers (ctrl, shift, alt, meta) and a key joined by +, for example ctrl+shift+p",
	);

// A leading `-` removes the default binding with the same key and command.
const command = z
	.string()
	.regex(/^-?[^\s-]\S*$/, "Expected a command id, optionally prefixed by -");

// Strict, so a misspelled field such as `wen` is reported instead of
// silently binding the key everywhere.
export const keybinding = z.strictObject({
	key,
	command,
	when: z.string().min(1).optional(),
});

// keybindings.json as core resolved it, sent to clients.
export const keybindingsState = z.object({
	bindings: z.array(keybinding),
	problems: z.array(fileProblem),
});

export type Keybinding = z.infer<typeof keybinding>;
export type KeybindingsState = z.infer<typeof keybindingsState>;
