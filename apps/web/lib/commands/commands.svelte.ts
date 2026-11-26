import { keyFromEvent } from "@yaa/commands/key-chord";
import { createKeymap } from "@yaa/commands/keymap";
import { type Context, parseWhen } from "@yaa/commands/when";
import type { Keybinding } from "@yaa/contracts/keybindings";
import type { CoreClient } from "../core-connection.ts";

// An action with an id (docs/spec/01-ui-layout-theming.md). Keys reach it
// through keybindings; the palette lists the ones with a title.
export type Command = {
	id: string;
	title?: string;
	category?: string;
	// When the command can run, and so whether the palette lists it.
	when?: string;
	// What `when` cannot say, such as whether the panel that runs the command
	// is open.
	enabled?(): boolean;
	run(): void;
};

// A command as the palette lists it.
export type PaletteEntry = { id: string; title: string; category?: string };

// What one contributor, the app or a plugin, registers: its commands and
// their default keys.
export type Contribution = {
	commands: readonly Command[];
	keybindings: readonly Keybinding[];
};

type Registered = Command & { holds(context: Context): boolean };

type CommandsOptions = {
	client: CoreClient;
	// The context keys as they are now.
	context(): Context;
};

const always = () => true;

const condition = ({ id, when }: Command) => {
	if (when === undefined) return always;
	const parsed = parseWhen(when);
	if (!parsed.ok) {
		throw new Error(`Command ${id}: bad when: ${parsed.message}`);
	}
	return parsed.test;
};

const compile = (command: Command): Registered => {
	const when = condition(command);
	return {
		...command,
		holds: (context) => when(context) && (command.enabled?.() ?? true),
	};
};

// The command registry and the keymap: the user's keybindings.json from
// core, which applies again on every save, then the default keys in the
// order they were registered, the app's first.
export const createCommands = ({ client, context }: CommandsOptions) => {
	// Read when a key is pressed or the palette opens, never by markup, so it
	// need not be reactive.
	const registry = new Map<string, Registered>();
	let defaults = $state.raw<readonly Keybinding[]>([]);
	let user = $state.raw<readonly Keybinding[]>([]);
	const keymap = $derived(createKeymap(defaults, user));

	client.request("keybindings.get", {}).then((state) => {
		user = state.bindings;
	});
	client.subscribe("keybindings.changed", (state) => {
		user = state.bindings;
	});

	const canRun = (id: string, now: Context) =>
		registry.get(id)?.holds(now) ?? false;

	const run = (id: string) => {
		const command = registry.get(id);
		if (command?.holds(context())) command.run();
	};

	return {
		// All or nothing: a clash or a bad `when` registers none of them.
		register({ commands, keybindings }: Contribution) {
			const compiled = commands.map(compile);
			const ids = new Set<string>();
			for (const { id } of compiled) {
				if (registry.has(id) || ids.has(id)) {
					throw new Error(`Command ${id} is registered twice`);
				}
				ids.add(id);
			}
			for (const command of compiled) registry.set(command.id, command);
			defaults = [...defaults, ...keybindings];
		},
		run,
		// The commands the palette lists in this context, in registration order.
		listed(now: Context): PaletteEntry[] {
			return [...registry.values()].flatMap(({ id, title, category, holds }) =>
				title === undefined || !holds(now)
					? []
					: [category === undefined ? { id, title } : { id, title, category }],
			);
		},
		keysFor(id: string): readonly string[] {
			return keymap.keysFor(id);
		},
		// The app's one key listener: a bound key runs its command and goes no
		// further; every other key reaches the focused element.
		handleKey(event: KeyboardEvent) {
			const key = keyFromEvent(event);
			if (key === undefined) return;
			const now = context();
			const id = keymap.resolve(key, now, (command) => canRun(command, now));
			if (id === undefined) return;
			event.preventDefault();
			event.stopPropagation();
			run(id);
		},
	};
};

export type CommandsController = ReturnType<typeof createCommands>;
