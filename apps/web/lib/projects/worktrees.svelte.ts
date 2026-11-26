import { coreSettings } from "@yaa/contracts/settings";
import type { NamingRules } from "@yaa/contracts/worktree-name";
import * as z from "zod";
import type { CoreClient } from "../core-connection.ts";
import type { PaletteController } from "../palette/index.ts";
import type { ProjectsController } from "./projects.svelte.ts";
import { branchPick, finishPick, namePick } from "./worktree-picks.ts";

type WorktreesOptions = {
	client: CoreClient;
	projects: ProjectsController;
	palette: PaletteController;
	report(message: string): void;
};

const settings = z.object(coreSettings);

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// A worktree on its way: the branch it is making, under its project.
export type Pending = { project: string; branch: string };

// Creating and finishing worktrees, by the palette's steps
// (docs/spec/02-worktrees.md). Core does the work; the tree shows what is
// under way until the project list comes back changed.
export const createWorktrees = ({
	client,
	projects,
	palette,
	report,
}: WorktreesOptions) => {
	let rules = $state.raw<NamingRules>({ template: "", ticketPrefix: "" });
	let creating = $state.raw<readonly Pending[]>([]);
	let finishing = $state.raw<ReadonlySet<string>>(new Set());

	const fail = (reason: unknown) => report(`Worktrees: ${describe(reason)}`);
	const readRules = (values: Record<string, unknown>) => {
		const read = settings.parse(values);
		rules = {
			template: read["worktree.branchTemplate"],
			ticketPrefix: read["worktree.ticketPrefix"],
		};
	};
	client
		.request("settings.get", {})
		.then(({ values }) => readRules(values), fail);
	client.subscribe("settings.changed", ({ values }) => readRules(values));

	const find = (id: string) =>
		projects.projects.find((project) => project.id === id);

	const create = (
		project: string,
		text: string,
		base: string,
		branch: string,
	) => {
		const pending = { project, branch };
		creating = [...creating, pending];
		client
			.request("worktrees.create", { project, text, base })
			.then((result) => {
				if ("problem" in result) report(result.problem);
				else projects.go({ project, worktree: result.worktree.id });
			}, fail)
			.finally(() => {
				creating = creating.filter((item) => item !== pending);
			});
	};

	// Asks for the name, then creates the worktree from `base`.
	const named = (project: string, base?: string) => {
		const found = find(project);
		if (found === undefined) return;
		const start = base ?? found.defaultBranch;
		palette.pick(
			namePick({
				base: start,
				defaultBranch: found.defaultBranch,
				rules,
				accept: (text, branch) => create(project, text, start, branch),
			}),
		);
	};

	return {
		get creating() {
			return creating;
		},
		isFinishing(id: string) {
			return finishing.has(id);
		},
		// From the default branch.
		create: (project: string) => named(project),
		// From a branch picked first.
		createFrom(project: string) {
			const found = find(project);
			if (found === undefined) return;
			client
				.request("projects.branches", { id: project })
				.then(({ branches }) => {
					palette.pick(
						branchPick(branches, found.defaultBranch, (base) =>
							named(project, base),
						),
					);
				}, fail);
		},
		// Says what finishing would lose, then asks how far to go. A finished
		// worktree that was open gives way to the project's main checkout.
		finish(project: string, id: string) {
			const found = find(project);
			const worktree = found?.worktrees.find((item) => item.id === id);
			if (found === undefined || worktree === undefined) return;
			client.request("worktrees.finishCheck", { id }).then((check) => {
				palette.pick(
					finishPick({
						branch: worktree.branch,
						defaultBranch: found.defaultBranch,
						check,
						accept(action, force) {
							finishing = new Set([...finishing, id]);
							const wasOpen = projects.place?.worktree === id;
							client
								.request("worktrees.finish", { id, action, force })
								.then(({ problem }) => {
									if (problem !== undefined) report(problem);
									const main = found.worktrees[0];
									if (wasOpen && main && projects.worktree === undefined) {
										projects.go({ project, worktree: main.id });
									}
								}, fail)
								.finally(() => {
									const next = new Set(finishing);
									next.delete(id);
									finishing = next;
								});
						},
					}),
				);
			}, fail);
		},
	};
};

export type WorktreesController = ReturnType<typeof createWorktrees>;
