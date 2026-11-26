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
import { AgentPanel } from "../agent/index.ts";
import Placeholder from "./Placeholder.svelte";

// The app's panel kinds, in panel bar order: placeholders until the plugins that
// own them arrive, and the chat's until the chat arrives in M2. A plugin's
// panel with the same id takes its place.
export const panelKinds: ReadonlyMap<string, PanelKind> = new Map([
	["files", { title: "Files", icon: ListTree, component: Placeholder }],
	["changes", { title: "Changes", icon: Diff, component: Placeholder }],
	["chat", { title: "Chat", icon: MessageCircle, component: AgentPanel }],
	["terminal", { title: "Terminal", icon: Terminal, component: Placeholder }],
	["review", { title: "Review", icon: ListChecks, component: Placeholder }],
	["usage", { title: "Usage", icon: DollarSign, component: Placeholder }],
	["workflows", { title: "Workflows", icon: Zap, component: Placeholder }],
]);

// Changes on the left, the editor with the terminal under it, chat on the
// right, after docs/design/mockups/Main.png.
export const defaultLayout: readonly DockPlacement[] = [
	{ kind: "changes" },
	{ kind: "editor", beside: { kind: "changes", direction: "right" } },
	{ kind: "chat", beside: { kind: "editor", direction: "right" } },
	{ kind: "terminal", beside: { kind: "editor", direction: "below" } },
];
