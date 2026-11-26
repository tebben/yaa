<script lang="ts">
import { Dock, type DockController } from "@yaa/ui/dock";
import { setPanelWorktree } from "./panel-worktree.ts";

// A worktree's grid, which tells its panels the worktree they are in.
let { worktree, dock }: { worktree: string; dock: DockController } = $props();
setPanelWorktree(() => worktree);
</script>

<Dock {dock} />
