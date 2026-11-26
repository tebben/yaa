<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import Folder from "@lucide/svelte/icons/folder";
import X from "@lucide/svelte/icons/x";
import { Icon } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";
import type { TreeProject } from "./project-tree.ts";
import type { ProjectView } from "./projects.svelte.ts";

// Projects with their default branch under them, drawn as a branch graph
// (docs/design/ui.md). A project's row selects its overview, a branch's
// row its worktree. The chevron and the remove button are for the mouse;
// keys reach the same through the rows and the palette.
let {
	tree,
	selected,
	isExpanded,
	list,
	onselect,
	ontoggle,
	onremove,
}: {
	tree: readonly TreeProject[];
	selected: { id: string; view: ProjectView } | undefined;
	isExpanded: (id: string) => boolean;
	list: Attachment<HTMLElement>;
	onselect: (id: string, view: ProjectView) => void;
	ontoggle: (id: string) => void;
	onremove: (id: string) => void;
} = $props();

const isSelected = (id: string, view: ProjectView) =>
	selected?.id === id && selected.view === view;
</script>

<ul class="flex flex-col" {@attach list}>
	{#each tree as { project, branches } (project.id)}
		{@const expanded = isExpanded(project.id)}
		<li>
			<div
				class={[
					"group flex h-control items-center pr-1.5 pl-1 hover:bg-hover has-[:focus-visible]:bg-hover",
					isSelected(project.id, "overview") && "bg-selection",
				]}
			>
				<button
					type="button"
					tabindex="-1"
					class="flex size-5 shrink-0 cursor-pointer items-center justify-center text-text-muted hover:text-text"
					aria-label={expanded ? "Collapse" : "Expand"}
					onclick={() => ontoggle(project.id)}
				>
					<Icon icon={expanded ? ChevronDown : ChevronRight} class="size-3.5" />
				</button>
				<button
					type="button"
					class="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 pl-1 text-left text-text outline-none"
					title={project.path}
					aria-current={isSelected(project.id, "overview") || undefined}
					onclick={() => onselect(project.id, "overview")}
				>
					<Icon icon={Folder} class="size-3.5 text-text-muted" />
					<span class="truncate">{project.name}</span>
				</button>
				<button
					type="button"
					tabindex="-1"
					class="hidden size-5 shrink-0 cursor-pointer items-center justify-center rounded-control text-text-muted group-hover:flex hover:bg-pressed hover:text-text"
					aria-label="Remove {project.name} from the list"
					title="Remove from the list"
					onclick={() => onremove(project.id)}
				>
					<Icon icon={X} class="size-3.5" />
				</button>
			</div>
			{#if expanded}
				<ul class="ml-4.5 border-l border-border">
					{#each branches as branch (branch)}
						<li>
							<button
								type="button"
								class={[
									"flex h-control w-full cursor-pointer items-center gap-2 pr-3 pl-3 text-left text-text-soft outline-none hover:bg-hover focus-visible:bg-hover focus-visible:text-text",
									isSelected(project.id, "branch") && "bg-selection text-text",
								]}
								aria-current={isSelected(project.id, "branch") || undefined}
								onclick={() => onselect(project.id, "branch")}
							>
								<span class="size-2 shrink-0 rounded-full bg-state-idle"></span>
								<span class="flex-1 truncate font-mono">{branch}</span>
								<span class="text-xs text-text-muted">default</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</li>
	{/each}
</ul>
