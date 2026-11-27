import { describe, expect, it } from "vitest";
import { migratePanelLayout } from "../panel-layout.ts";

describe("panel layout migration", () => {
	it("renames the Changes panel without moving the group", () => {
		const layout = {
			grid: {
				root: {
					type: "leaf",
					data: { id: "1", views: ["changes", "chat"], activeView: "changes" },
				},
				width: 100,
				height: 100,
				orientation: "HORIZONTAL",
			},
			panels: {
				changes: {
					id: "changes",
					contentComponent: "changes",
					title: "Changes",
				},
				chat: { id: "chat", contentComponent: "chat", title: "Chat" },
			},
			activeGroup: "1",
		};
		expect(JSON.parse(migratePanelLayout(JSON.stringify(layout)))).toEqual({
			...layout,
			grid: {
				...layout.grid,
				root: {
					...layout.grid.root,
					data: { id: "1", views: ["git", "chat"], activeView: "git" },
				},
			},
			panels: {
				git: { id: "git", contentComponent: "git", title: "Git" },
				chat: layout.panels.chat,
			},
		});
	});
});
