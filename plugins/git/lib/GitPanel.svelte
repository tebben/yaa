<script lang="ts">
import Minus from "@lucide/svelte/icons/minus";
import Plus from "@lucide/svelte/icons/plus";
import Trash from "@lucide/svelte/icons/trash-2";
import type { GitSection } from "@yaa/contracts/worktree-files";
import type { PanelProps } from "@yaa/plugin-api/ui";
import { Button, IconButton } from "@yaa/ui";
import { untrack } from "svelte";
import { createGitPanel } from "./git-panel.svelte.ts";

let { panel }: PanelProps = $props();
const git = createGitPanel(untrack(() => panel));
const staged = $derived(git.changes.filter((change) => change.staged !== null));
const unstaged = $derived(
	git.changes.filter((change) => change.unstaged !== null),
);
const groups: readonly { title: string; section: GitSection }[] = [
	{ title: "Staged", section: "staged" },
	{ title: "Unstaged", section: "unstaged" },
];
const statusNames = {
	modified: "M",
	added: "A",
	deleted: "D",
	renamed: "R",
	copied: "C",
	typeChanged: "T",
	untracked: "U",
	unmerged: "!",
} as const;
</script>

<section class="git" aria-label="Git changes">
	<div class="toolbar">
		<Button onclick={git.toggleTree}>{git.tree ? "List" : "Tree"}</Button>
		<Button
			disabled={git.busy || unstaged.length === 0}
			onclick={() => git.stage(unstaged.map((change) => change.path))}
			>Stage all</Button
		>
	</div>
	{#if git.problem}
		<p class="problem">{git.problem}</p>
	{/if}
	{#each groups as group (group.section)}
		<section aria-label={`${group.title} changes`}>
			<h3>
				{group.title}
				{group.section === "staged" ? staged.length : unstaged.length}
			</h3>
			{#each git.rows(group.section) as row (row.path)}
				<div class="row" style:--depth={row.depth}>
					{#if row.folder}
						<span class="path">{row.label}</span>
					{:else}
						<button
							class="path"
							type="button"
							title={row.path}
							onclick={(event) =>
								git.open(group.section, row.path, event.detail === 0)}
							ondblclick={() => git.open(group.section, row.path, true, true)}
						>
							{row.label}
						</button>
						{@const status = git.changes.find(
							(item) => item.path === row.path,
						)?.[group.section]}
						<span class="status">{status ? statusNames[status] : ""}</span>
					{/if}
					<IconButton
						icon={group.section === "staged" ? Minus : Plus}
						label={`${group.section === "staged" ? "Unstage" : "Stage"} ${row.path}`}
						disabled={git.busy}
						onclick={() =>
							group.section === "staged"
								? git.unstage(row.paths)
								: git.stage(row.paths)}
					/>
					<IconButton
						icon={Trash}
						label={`Discard ${group.section} changes to ${row.path}`}
						disabled={git.busy}
						onclick={() => git.askDiscard(group.section, row.paths)}
					/>
				</div>
			{/each}
		</section>
	{/each}
	{#if git.confirm}
		<p>
			Discard {git.confirm.section} changes to {git.confirm.paths.join(", ")}?
		</p>
		<Button onclick={git.discard}>Discard</Button>
		<Button onclick={git.cancelDiscard}>Cancel</Button>
	{/if}
	<label
		>Commit message
		<textarea
			bind:value={() => git.message, (value) => (git.message = value)}
		></textarea>
	</label>
	<Button
		disabled={git.busy || staged.length === 0 || !git.message.trim()}
		onclick={git.commit}
		>Commit</Button
	>
</section>

<style>
.git {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2);
	height: 100%;
	overflow: auto;
	padding: var(--spacing-3);
}
.toolbar,
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing-1);
}
.path {
	padding-left: calc(var(--depth) * var(--spacing-3));
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	font-family: var(--font-mono);
	text-align: left;
}
.problem {
	color: var(--color-state-error);
}
.status {
	color: var(--color-text-muted);
	font-family: var(--font-mono);
}
label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-1);
}
textarea {
	background: var(--color-raised);
	color: var(--color-text);
	border: 1px solid var(--color-border-strong);
}
</style>
