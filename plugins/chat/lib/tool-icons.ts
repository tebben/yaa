import ArrowRightLeft from "@lucide/svelte/icons/arrow-right-left";
import Brain from "@lucide/svelte/icons/brain";
import Diff from "@lucide/svelte/icons/diff";
import File from "@lucide/svelte/icons/file";
import Globe from "@lucide/svelte/icons/globe";
import Search from "@lucide/svelte/icons/search";
import Shield from "@lucide/svelte/icons/shield";
import Terminal from "@lucide/svelte/icons/terminal";
import Trash from "@lucide/svelte/icons/trash-2";
import Wrench from "@lucide/svelte/icons/wrench";
import type { ToolKind } from "@yaa/contracts/agent-events";

export const toolIcons: Record<ToolKind, typeof File> = {
	read: File,
	edit: Diff,
	delete: Trash,
	move: ArrowRightLeft,
	search: Search,
	execute: Terminal,
	think: Brain,
	fetch: Globe,
	switch_mode: Shield,
	other: Wrench,
};
