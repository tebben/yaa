import type { Keybinding } from "@yaa/contracts/keybindings";
import { normalizeKey } from "./key-chord.ts";
import { type Context, parseWhen } from "./when.ts";

// What the keymap needs of a command that can run now.
export type Runnable = {
	// The panel a command runs in, if it runs in one.
	panel?: string | undefined;
};

type Entry = {
	command: string;
	global: boolean;
	test(context: Context): boolean;
};

export type Keymap = {
	// The command of the first binding for `key` whose condition holds and
	// whose command can run now; a binding to a command that is missing,
	// such as one from a removed plugin, does not take the key. `runnable`
	// returns undefined for a command that cannot run. A binding of a panel's
	// command holds only while that panel is focused, unless it is global.
	resolve(
		key: string,
		context: Context,
		runnable: (command: string) => Runnable | undefined,
	): string | undefined;
	// The keys bound to a command, user bindings first, for display.
	keysFor(command: string): readonly string[];
};

const REMOVE = "-";

const always = () => true;

const focused = (context: Context, panel: string) =>
	context["focus.region"] === "dock" && context["panel.kind"] === panel;

const compile = (binding: Keybinding): Entry => {
	const { command, global = false } = binding;
	if (binding.when === undefined) {
		return { command, global, test: always };
	}
	const when = parseWhen(binding.when);
	// Core drops user bindings with a bad condition and the defaults are ours,
	// so a bad one here is a bug.
	if (!when.ok) {
		throw new Error(`Bad when “${binding.when}”: ${when.message}`);
	}
	return { command, global, test: when.test };
};

// User bindings are checked before the defaults. A user binding whose
// command starts with `-` removes the default with that key and command.
export const createKeymap = (
	defaults: readonly Keybinding[],
	user: readonly Keybinding[],
): Keymap => {
	const normalized = (bindings: readonly Keybinding[]) =>
		bindings.map((binding) => ({ ...binding, key: normalizeKey(binding.key) }));
	const users = normalized(user);
	const removed = new Set(
		users
			.filter((binding) => binding.command.startsWith(REMOVE))
			.map((binding) => `${binding.key} ${binding.command.slice(1)}`),
	);
	const bindings = [
		...users.filter((binding) => !binding.command.startsWith(REMOVE)),
		...normalized(defaults).filter(
			(binding) => !removed.has(`${binding.key} ${binding.command}`),
		),
	];
	const byKey = new Map<string, Entry[]>();
	const byCommand = new Map<string, string[]>();
	for (const binding of bindings) {
		const entries = byKey.get(binding.key) ?? [];
		entries.push(compile(binding));
		byKey.set(binding.key, entries);
		const keys = byCommand.get(binding.command) ?? [];
		if (!keys.includes(binding.key)) keys.push(binding.key);
		byCommand.set(binding.command, keys);
	}
	return {
		resolve: (key, context, runnable) =>
			byKey.get(key)?.find(({ command, global, test }) => {
				if (!test(context)) return false;
				const target = runnable(command);
				if (target === undefined) return false;
				const { panel } = target;
				return global || panel === undefined || focused(context, panel);
			})?.command,
		keysFor: (command) => byCommand.get(command) ?? [],
	};
};
