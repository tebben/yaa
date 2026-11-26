import {
	Diff,
	DollarSign,
	ListChecks,
	ListTree,
	MessageCircle,
	Terminal,
	Zap,
} from "@lucide/svelte";
import type { DockPlacement, PanelKind } from "@yaa/ui/dock";
import Placeholder from "./Placeholder.svelte";

// The panel kinds of the right rail, in rail order. Placeholders until the
// plugin host (M1 step 7) lets plugins contribute them.
export const panelKinds: ReadonlyMap<string, PanelKind> = new Map([
	["files", { title: "Files", icon: ListTree, component: Placeholder }],
	["changes", { title: "Changes", icon: Diff, component: Placeholder }],
	["chat", { title: "Chat", icon: MessageCircle, component: Placeholder }],
	["terminal", { title: "Terminal", icon: Terminal, component: Placeholder }],
	["review", { title: "Review", icon: ListChecks, component: Placeholder }],
	["usage", { title: "Usage", icon: DollarSign, component: Placeholder }],
	["workflows", { title: "Workflows", icon: Zap, component: Placeholder }],
]);

// Changes on the left, chat on the right with the terminal under it, after
// docs/design/mockups/Main.png without its editor.
export const defaultLayout: readonly DockPlacement[] = [
	{ kind: "changes" },
	{ kind: "chat", beside: { kind: "changes", direction: "right" } },
	{ kind: "terminal", beside: { kind: "chat", direction: "below" } },
];
