<script lang="ts">
import { Dock, type DockController } from "@yaa/ui/dock";
import { untrack } from "svelte";
import { setPanelWorktree } from "./plugins/index.ts";

// One worktree's grid, telling its panels which worktree they are in. A dock
// stays with its worktree, so the id is read once.
let { worktree, dock }: { worktree: string; dock: DockController } = $props();
setPanelWorktree(untrack(() => worktree));
</script>

<Dock {dock} />
