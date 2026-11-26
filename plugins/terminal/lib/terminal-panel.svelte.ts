import type { Terminal } from "@yaa/contracts/terminals";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { onDestroy } from "svelte";
import type { Attachment } from "svelte/attachments";
import { neighbour, toTabs } from "./terminal-tabs.ts";
import {
	createTerminalView,
	type TerminalView,
} from "./terminal-view.svelte.ts";

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The terminal panel: the worktree's terminals as tabs, the one on screen
// and the panel's commands. Call while the component sets up.
export const createTerminalPanel = (panel: PanelContext) => {
	// Undefined until core has listed them.
	let list = $state.raw<readonly Terminal[]>();
	let selected = $state<string>();
	let problem = $state<string>();
	const fail = (reason: unknown) => {
		problem = describe(reason);
	};
	// A view per terminal shown so far, kept for its scroll and selection.
	const views = new Map<string, TerminalView>();
	// The element the view on screen is in.
	let screen = $state.raw<HTMLElement>();
	// Terminals asked for and not yet there.
	let creating = 0;
	// Focus was asked for while there was no terminal to give it to.
	let wanted = false;

	const view = (id: string) => {
		let found = views.get(id);
		if (found === undefined) {
			found = createTerminalView({ id, terminals: panel.terminals, fail });
			views.set(id, found);
		}
		return found;
	};
	// A view not yet on screen takes focus once it is.
	const select = (id: string) => {
		selected = id;
		view(id).focus();
	};

	// A new terminal, which takes focus when `focus` says so.
	const create = (focus: boolean) => {
		creating += 1;
		problem = undefined;
		panel.terminals
			.create()
			.then((id) => {
				if (focus) select(id);
				else selected = id;
			}, fail)
			.finally(() => {
				creating -= 1;
			});
	};

	panel.terminals.watch((next) => {
		const first = list === undefined;
		const before = list ?? [];
		const there = new Set(next.map(({ id }) => id));
		for (const [id, gone] of views) {
			if (there.has(id)) continue;
			// Focus goes on to the terminal that takes its place.
			wanted ||= gone.element.contains(document.activeElement);
			views.delete(id);
			gone.dispose();
		}
		list = next;
		if (selected === undefined || !there.has(selected)) {
			// A terminal just asked for may be selected before it is listed.
			if (selected === undefined || before.some(({ id }) => id === selected)) {
				selected = neighbour(before, next, selected);
			}
		}
		// A panel opens onto a terminal.
		if (first && next.length === 0 && creating === 0) {
			create(wanted);
			wanted = false;
		} else if (wanted && selected !== undefined) {
			wanted = false;
			select(selected);
		}
	});

	// Runs `task` for the terminal on screen.
	const onSelected = (task: (id: string) => void) => () => {
		if (selected !== undefined) task(selected);
	};
	const close = (id: string) => {
		panel.terminals.close(id).catch(fail);
	};
	const cycle = (step: 1 | -1) => {
		if (list === undefined || list.length === 0) return;
		const index = list.findIndex(({ id }) => id === selected);
		const next = list.at((index + step) % list.length);
		if (next !== undefined) select(next.id);
	};
	const commands: Record<string, () => void> = {
		"terminal.focus": () => {
			if (selected !== undefined) select(selected);
			else if (list?.length === 0 && creating === 0) create(true);
			else wanted = true;
		},
		"terminal.new": () => create(true),
		"terminal.close": onSelected(close),
		"terminal.next": () => cycle(1),
		"terminal.previous": () => cycle(-1),
		"terminal.copy": onSelected((id) => view(id).copy()),
	};
	for (const [command, run] of Object.entries(commands)) {
		panel.commands.register(command, run);
	}

	$effect(() => {
		if (screen === undefined) return;
		if (selected === undefined) {
			screen.replaceChildren();
			return;
		}
		const shown = view(selected);
		// Focus may be waiting on the panel itself, as after the rail opened it.
		const waiting =
			document.activeElement !== document.body &&
			document.activeElement?.contains(screen);
		screen.replaceChildren(shown.element);
		if (waiting) shown.focus();
	});
	onDestroy(() => {
		for (const each of views.values()) each.dispose();
		views.clear();
	});

	const attach: Attachment<HTMLElement> = (element) => {
		screen = element;
		return () => {
			screen = undefined;
		};
	};

	return {
		attach,
		get tabs() {
			return toTabs(list ?? [], panel.worktree.path, selected);
		},
		get empty() {
			return list?.length === 0;
		},
		get problem() {
			return problem;
		},
		select,
		close,
		create: () => create(true),
	};
};

export type TerminalPanelController = ReturnType<typeof createTerminalPanel>;
