<script lang="ts">
import Archive from "@lucide/svelte/icons/archive";
import type { WorktreeState } from "@yaa/contracts/worktree-state";
import { stateBadges } from "../worktree-state.ts";
import BranchGraph from "./BranchGraph.svelte";
import RowAction from "./RowAction.svelte";

// A worktree in the project tree: its node in the branch graph and its
// branch. The main checkout is marked as the default branch and cannot be
// finished. A worktree under way, being created or finished, cannot be
// selected.
let {
	branch,
	title,
	main,
	last,
	selected,
	busy,
	state,
	onselect,
	onfinish,
}: {
	branch: string;
	title: string;
	main: boolean;
	last: boolean;
	selected: boolean;
	busy: boolean;
	state?: WorktreeState;
	onselect?: () => void;
	onfinish?: (() => void) | undefined;
} = $props();
</script>

<li
	class={[
		"group flex h-control items-center pr-1.5 hover:bg-hover has-[:focus-visible]:bg-hover",
		selected && "bg-selection",
	]}
>
	<button
		type="button"
		class={[
			"flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left font-mono text-sm outline-none disabled:cursor-default",
			selected ? "text-text" : "text-text-soft",
			busy && "text-text-muted",
		]}
		title={state ? `${title}, ${stateBadges[state].label}` : title}
		disabled={busy || onselect === undefined}
		aria-current={selected || undefined}
		onclick={onselect}
	>
		<BranchGraph {last} {main} {busy} state={state ?? "idle"} />
		<span class="truncate">{branch}</span>
	</button>
	{#if main}
		<span class="px-1.5 text-xs text-text-muted">default</span>
	{:else if onfinish && !busy}
		<div class="hidden group-hover:flex">
			<RowAction icon={Archive} label="Finish {branch}" onclick={onfinish} />
		</div>
	{/if}
</li>
