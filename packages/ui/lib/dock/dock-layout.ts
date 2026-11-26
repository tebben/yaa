import { Orientation } from "dockview-core";
import * as z from "zod";

// The part of dockview's SerializedDockview that the dock uses. A saved
// layout comes back from disk, so it is checked before dockview sees it:
// dockview throws on a layout whose groups name panels it does not list.
// Fields the dock never sets (floating and popout groups, tab groups,
// constraints) are dropped.

const groupView = z.object({
	id: z.string(),
	views: z.array(z.string()),
	activeView: z.string().exactOptional(),
	hideHeader: z.boolean().exactOptional(),
});

type GroupView = z.output<typeof groupView>;
type GridNode = {
	type: "leaf" | "branch";
	data: GroupView | GridNode[];
	size?: number;
	visible?: boolean;
};

const nodeFields = {
	size: z.number().exactOptional(),
	visible: z.boolean().exactOptional(),
};
const gridNode: z.ZodType<GridNode> = z.lazy(() =>
	z.discriminatedUnion("type", [
		z.object({ type: z.literal("leaf"), data: groupView, ...nodeFields }),
		z.object({
			type: z.literal("branch"),
			data: z.array(gridNode),
			...nodeFields,
		}),
	]),
);

const panelState = z.object({
	id: z.string(),
	contentComponent: z.string().exactOptional(),
	title: z.string().exactOptional(),
});

const views = (node: GridNode): string[] =>
	Array.isArray(node.data) ? node.data.flatMap(views) : node.data.views;

const dockLayout = z
	.object({
		grid: z.object({
			root: gridNode,
			width: z.number(),
			height: z.number(),
			orientation: z.enum(Orientation),
		}),
		panels: z.record(z.string(), panelState),
		activeGroup: z.string().exactOptional(),
	})
	.refine(
		(layout) => views(layout.grid.root).every((id) => id in layout.panels),
		"A group lists a panel the layout does not have",
	);

export type DockLayout = z.output<typeof dockLayout>;

const json = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
};

// The saved text as a layout dockview can restore, or undefined when it is
// not one: not JSON, or from a dockview whose format changed. dockview's own
// type is checked where the dock restores it, so an upgrade that changes the
// format fails the typecheck.
export const parseDockLayout = (text: string): DockLayout | undefined =>
	dockLayout.safeParse(json(text)).data;
