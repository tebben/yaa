import { parseDockLayout } from "@yaa/ui/dock";

// The Changes placeholder became the Git plugin. Keep its saved position.
export const migratePanelLayout = (text: string): string => {
	const layout = parseDockLayout(text);
	const old = layout?.panels["changes"];
	if (layout === undefined || old === undefined || layout.panels["git"]) {
		return text;
	}
	const rename = (node: typeof layout.grid.root): void => {
		if (node.type === "branch" && Array.isArray(node.data)) {
			for (const child of node.data) rename(child);
		} else if (!Array.isArray(node.data)) {
			node.data.views = node.data.views.map((id) =>
				id === "changes" ? "git" : id,
			);
			if (node.data.activeView === "changes") node.data.activeView = "git";
		}
	};
	rename(layout.grid.root);
	delete layout.panels["changes"];
	layout.panels["git"] = {
		...old,
		id: "git",
		contentComponent: "git",
		title: "Git",
	};
	return JSON.stringify(layout);
};
