<script lang="ts">
import GitBranch from "@lucide/svelte/icons/git-branch";
import type { BranchStatus } from "@yaa/contracts/projects";
import type { WorktreeState } from "@yaa/contracts/worktree-state";
import { Icon } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";
import { stateBadges } from "../worktree-state.ts";

// Core info for the selected project: the branch checked out, how far it is
// ahead of and behind its upstream, and the uncommitted changes. At the
// right, the last failure, such as an unreachable core or a command that
// failed, then the open worktree's state. Plugin chips arrive with the
// footer slots.
let {
	status,
	state,
	message,
	region,
}: {
	status: BranchStatus | undefined;
	state: WorktreeState | undefined;
	message: string | undefined;
	region: Attachment<HTMLElement>;
} = $props();
</script>

<footer
	{@attach region}
	class="yaa-focus-region col-span-3 col-start-1 row-start-3 flex h-footer items-center gap-4 border-t border-border bg-chrome px-3 text-sm text-text-muted"
>
	{#if status}
		<span class="flex min-w-0 items-center gap-1.5">
			<Icon icon={GitBranch} class="size-3.5" />
			<span class="truncate font-mono">{status.branch ?? "detached"}</span>
		</span>
		{#if status.upstream}
			<span class="font-mono" title="Ahead of and behind {status.upstream}"
				>↑{status.ahead} ↓{status.behind}</span
			>
		{/if}
		<span>
			{status.changes === 0
				? "No changes"
				: `${status.changes} ${status.changes === 1 ? "change" : "changes"}`}
		</span>
	{/if}
	<span class="ml-auto truncate text-state-error">{message}</span>
	{#if state}
		{@const badge = stateBadges[state]}
		<span class={["flex shrink-0 items-center gap-1.5", badge.text]}>
			<svg class="size-2" viewBox="0 0 8 8" aria-hidden="true">
				<circle class={badge.fill} cx="4" cy="4" r="4" />
			</svg>
			{badge.label}
		</span>
	{/if}
</footer>
