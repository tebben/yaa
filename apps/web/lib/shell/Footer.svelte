<script lang="ts">
import GitBranch from "@lucide/svelte/icons/git-branch";
import type { BranchStatus } from "@yaa/contracts/projects";
import { Icon } from "@yaa/ui";
import type { Attachment } from "svelte/attachments";

// Core info for the selected project: the branch checked out, how far it is
// ahead of and behind its upstream, and the uncommitted changes. Then the
// last failure, such as an unreachable core or a command that failed.
// Plugin chips arrive with the footer slots.
let {
	status,
	message,
	region,
}: {
	status: BranchStatus | undefined;
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
	{#if message}
		<span class="ml-auto truncate text-state-error">{message}</span>
	{/if}
</footer>
