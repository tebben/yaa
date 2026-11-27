<script lang="ts">
import Archive from "@lucide/svelte/icons/archive";
import ArchiveRestore from "@lucide/svelte/icons/archive-restore";
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import Trash2 from "@lucide/svelte/icons/trash-2";
import type { Worktree } from "@yaa/contracts/projects";
import { Icon } from "@yaa/ui";
import RowAction from "./RowAction.svelte";

// A project's settled worktrees, below its branch graph and folded away at
// first (docs/spec/02-worktrees.md). Selecting one reopens it.
let {
	settled,
	shown,
	isFinishing,
	ontoggle,
	onreopen,
	onremove,
}: {
	settled: readonly Worktree[];
	shown: boolean;
	isFinishing: (id: string) => boolean;
	ontoggle: () => void;
	onreopen: (worktree: string) => void;
	onremove: (worktree: string) => void;
} = $props();
</script>

<li>
	<button
		type="button"
		class="flex h-control w-full cursor-pointer items-center gap-1.5 pr-1.5 text-left text-sm text-text-muted outline-none hover:bg-hover hover:text-text focus-visible:bg-hover"
		aria-expanded={shown}
		onclick={ontoggle}
	>
		<span class="flex w-graph shrink-0 justify-end pr-0.5">
			<Icon icon={shown ? ChevronDown : ChevronRight} class="size-3.5" />
		</span>
		<Icon icon={Archive} class="size-3.5 shrink-0" />
		<span>Settled</span>
		<span class="font-mono text-xs">{settled.length}</span>
	</button>
</li>
{#if shown}
	{#each settled as worktree (worktree.id)}
		{@const busy = isFinishing(worktree.id)}
		<li
			class="group flex h-control items-center pr-1.5 hover:bg-hover has-[:focus-visible]:bg-hover"
		>
			<button
				type="button"
				class="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left font-mono text-sm text-text-muted outline-none disabled:cursor-default"
				title="{worktree.path}, settled: select to reopen"
				disabled={busy}
				onclick={() => onreopen(worktree.id)}
			>
				<span class="w-graph shrink-0"></span>
				<span class="truncate">{worktree.branch}</span>
			</button>
			{#if !busy}
				<div class="hidden group-hover:flex">
					<RowAction
						icon={ArchiveRestore}
						label="Reopen {worktree.branch}"
						onclick={() => onreopen(worktree.id)}
					/>
					<RowAction
						icon={Trash2}
						label="Remove {worktree.branch}"
						onclick={() => onremove(worktree.id)}
					/>
				</div>
			{/if}
		</li>
	{/each}
{/if}
