<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import Folder from "@lucide/svelte/icons/folder";
import GitBranchPlus from "@lucide/svelte/icons/git-branch-plus";
import X from "@lucide/svelte/icons/x";
import type { WorktreeState } from "@yaa/contracts/worktree-state";
import { Icon } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";
import type { Place, TreeProject } from "./project-tree.ts";
import RowAction from "./RowAction.svelte";
import WorktreeRow from "./WorktreeRow.svelte";
import type { Pending } from "./worktrees.svelte.ts";

// Projects with their worktrees, drawn as a branch graph (docs/design/ui.md).
// Hover actions are for the mouse; the palette reaches the same by key.
let {
	tree,
	place,
	creating,
	isFinishing,
	isExpanded,
	stateOf,
	list,
	onselect,
	ontoggle,
	onremove,
	oncreate,
	onfinish,
}: {
	tree: readonly TreeProject[];
	place: Place | undefined;
	creating: readonly Pending[];
	isFinishing: (id: string) => boolean;
	isExpanded: (id: string) => boolean;
	stateOf: (worktree: string) => WorktreeState;
	list: Attachment<HTMLElement>;
	onselect: (place: Place) => void;
	ontoggle: (id: string) => void;
	onremove: (id: string) => void;
	oncreate: (project: string) => void;
	onfinish: (project: string, worktree: string) => void;
} = $props();
</script>

<ul class="flex flex-col gap-2" {@attach list}>
	{#each tree as { project, worktrees } (project.id)}
		{@const expanded = isExpanded(project.id)}
		{@const overview = place?.project === project.id && !place.worktree}
		{@const pending = creating.filter((item) => item.project === project.id)}
		{@const created = project.worktrees.length - 1}
		<li>
			<div
				class={[
					"group flex h-control items-center pr-1.5 pl-1 hover:bg-hover has-[:focus-visible]:bg-hover",
					overview && "bg-selection",
				]}
			>
				<button
					type="button"
					tabindex="-1"
					class="flex h-full w-4.5 shrink-0 cursor-pointer items-center justify-center text-text-muted hover:text-text"
					aria-label={expanded ? "Collapse" : "Expand"}
					onclick={() => ontoggle(project.id)}
				>
					<Icon icon={expanded ? ChevronDown : ChevronRight} class="size-3.5" />
				</button>
				<button
					type="button"
					class="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 pl-1 text-left font-medium text-text outline-none"
					title={project.path}
					aria-current={overview || undefined}
					onclick={() => onselect({ project: project.id })}
				>
					<Icon icon={Folder} class="size-3.5 shrink-0 text-text-muted" />
					<span class="truncate">{project.name}</span>
				</button>
				{#if !expanded && created > 0}
					<span
						class="px-1.5 font-mono text-xs text-text-muted group-hover:hidden"
						title="{created} worktrees"
						>{created}</span
					>
				{/if}
				<div class="hidden items-center group-hover:flex">
					<RowAction
						icon={GitBranchPlus}
						label="New worktree in {project.name}"
						onclick={() => oncreate(project.id)}
					/>
					<RowAction
						icon={X}
						label="Remove {project.name} from the list"
						onclick={() => onremove(project.id)}
					/>
				</div>
			</div>
			{#if expanded}
				<ul>
					{#each worktrees as worktree, index (worktree.id)}
						{@const main = worktree.index === 0}
						<WorktreeRow
							branch={worktree.branch}
							title="{worktree.path}, YAA_WORKTREE_INDEX={worktree.index}"
							{main}
							last={index === worktrees.length - 1 && pending.length === 0}
							selected={place?.worktree === worktree.id}
							busy={isFinishing(worktree.id)}
							state={stateOf(worktree.id)}
							onselect={() =>
								onselect({ project: project.id, worktree: worktree.id })}
							onfinish={main
								? undefined
								: () => onfinish(project.id, worktree.id)}
						/>
					{/each}
					{#each pending as item, index (item)}
						<WorktreeRow
							branch={item.branch}
							title="Creating {item.branch}"
							main={false}
							last={index === pending.length - 1}
							selected={false}
							busy
						/>
					{/each}
				</ul>
			{/if}
		</li>
	{/each}
</ul>
