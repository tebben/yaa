<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Projects and worktrees

Lands in: M2. Creating from a ticket, Done on PR merge and the project overview: M4.

A project is a git repository added by folder, chosen with the system's folder picker, which Electron main shows for the core. Any folder in the repository adds the repository by its main checkout; a folder outside a repository, a bare repository or a project already in the list is refused with the reason. The project list lives in the database, in the order added; removing a project takes it off the list and leaves its folder alone. The default branch is the one `origin/HEAD` points at, or, without it, the branch checked out in the main checkout when the project is added. A worktree is the unit of work: it owns a branch, a working directory, open tabs, a panel layout, terminals, chat sessions and a usage ledger. A project's main checkout is its first worktree, which cannot be finished; the others are the ones yaa created, listed oldest first, with the settled ones apart below them. Removing a project forgets its worktrees and leaves their folders alone. Switching worktrees swaps all of that at once; agents in other worktrees keep running in the background. Each worktree keeps its own dock grid, created the first time it opens and kept while the app runs, so its panels are as they were when you switch back; its layout is saved with it and goes when its folder is removed. The window reopens where it was (`11-platform-services.md`).

**Lifecycle**

- **Create:** from the default branch or any branch; from a ticket in the issue tracker; or by ticket id typed into the command palette. New worktree (Ctrl Shift N, or the branch button on a hovered project) asks for a name in the palette and shows the branch it will make as you type; New worktree from branch first picks the branch, local or remote, to start from. A named worktree gets a new branch from that start without tracking it; with the name left empty, a branch other than the default one is checked out itself, a remote one as a local branch that tracks it. A branch name that exists, a folder that exists or a git failure is refused with the reason, and nothing is added. Worktrees are created under a configurable directory, the `worktree.directory` setting. The default is a central folder, `~/.local/share/yaa/worktrees/<project>/<worktree>` (`docs/decisions/0010-worktree-location.md`).
- **Naming:** a per-project strategy decides the branch and folder name: a template such as `{ticketId}-{slug}`, a default prefix so that typing `123` resolves to `PROJ-123`, or an LLM-generated name from a prompt the user sets for the project. A ticket id at the start of the name (`123` or `geo-12`, upper-cased to `GEO-12`) fills `{ticketId}`, the bare number with the default prefix in front; the rest becomes the slug, lower case ASCII words joined by `-`, cut to 48 characters at a word. The separators next to an empty part drop out, and the folder is the branch with each `/` as `-`. In M2 the template and the prefix are the app settings `worktree.branchTemplate` and `worktree.ticketPrefix`; the project layer (M6, `11-platform-services.md`) makes them per project. The LLM-generated name arrives with the generated text model (`docs/decisions/0007-generated-text-model.md`).
- **Switch:** Alt J and Alt K go to the next and previous worktree in the left menu's order, across projects, skipping settled ones, and the left menu jumps to any of them.
- **Setup and teardown:** a new worktree has no `node_modules`, `.env` or build output. Each project defines setup steps that run after create: files to copy from the main checkout (globs, for example `.env*`) and commands to run in the worktree (for example `pnpm install`). Teardown commands run before the folder is removed, so not when settling or when the folder is gone already. Output goes to a terminal in the worktree (in M2, before the terminal, to the debug panel: `docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md`), and a failed step sets the worktree to Error without removing it. The steps live in project settings (M6), or in a project file that may be committed with the repository.
- **Project file:** `.yaa/worktree.json` in the main checkout, read there each time, whatever the worktree's branch holds (`docs/decisions/0027-worktree-steps-file.md`): `{ "copy": [".env*"], "setup": ["pnpm install"], "teardown": ["docker compose down"] }`, each list optional. A file that does not parse or has an unknown field runs no step and fails the phase.
- **Running steps:** `copy` entries are git glob patterns (`*` stops at `/`, `**` does not, a folder's name takes all in it) matched against the files git does not track, ignored ones included; a file the worktree already has is kept. Then the setup commands run in order with `sh -c` in the worktree, and the first one that fails ends the phase. Setup runs while the worktree is already usable. A failed teardown keeps the worktree and the footer says why; settling it still works. Finishing stops a setup still running, and so does quitting yaa, which counts as a failed step; the stop reaches every process the command started in its process group.
- **Ports:** each worktree gets a stable index, exposed to setup steps, terminals and agents as `YAA_WORKTREE_INDEX`, so a project can offset dev-server ports and run several worktrees at once. The main checkout is 0; a created worktree gets the lowest number from 1 up that no other worktree of the project holds, and keeps it, settled too, until its folder is removed.
- **Finish:** one action puts the worktree away (Finish worktree in the palette, or the button on a hovered worktree). It warns about uncommitted changes and about commits on its branch that are neither on a remote nor on the default branch, then offers to settle it, or to remove it, each step including the ones before: remove the folder, delete the local branch, and delete the branch on its upstream's remote when it has one. When work would be lost, the choices that keep it come first, and the ones that lose it say what they lose; picking one is the explicit override (`git worktree remove --force`, `git branch -D`), so a dirty worktree is never removed without it. A folder already removed outside yaa is pruned from git's records. Once the folder is gone the worktree is off the list, even when deleting a branch then fails; that failure is reported. Finishing the open worktree opens the project's main checkout. Finishing never forgets a worktree whose folder stays on disk (`docs/decisions/0037-settled-worktrees.md`).
- **Settle:** a settled worktree keeps its folder, branch, index, chats, layout and terminals' directories, and nothing runs in it: its agents, terminals, file watches and setup end. The left menu lists a project's settled worktrees under a Settled row below its branch graph, folded at first and opened while searching. Selecting one, its reopen button, or Reopen settled worktree in the palette puts it back in use and opens it, refused with the reason when its folder is gone; its remove button finishes it with the removing choices only. Its chats resume their agents when next used (`11-platform-services.md`).

**State**

State is derived from events, not polled, and shown as a badge in the left menu (the colour of the worktree's node in the tree), in the footer (the open worktree's) and, from M4, in the project overview. Core writes those events to an append-only event log in SQLite, so the derived state is the same after a restart.

| State | Set by | Meaning |
| --- | --- | --- |
| Idle | no running turn | nothing is happening |
| Running | agent turn started, setup or teardown steps running, or a workflow step running | an agent or a run is working |
| Needs attention | agent question or permission request, or a run waiting for approval | the agent or run is blocked on the user |
| Error | provider or tool failure, crashed agent, failed setup step | the last turn or step failed |
| Done | user, or PR merged (M4) | ready to finish |

A worktree can have several chats and workflow runs. Each chat, each run, the setup and teardown steps and the done mark is a source with its own state, and the worktree shows the highest one in this order: Needs attention, Error, Running, Done, Idle. The reducer from events to state, and this ordering, are pure functions with unit tests.

How long a source keeps its state (`docs/decisions/0028-worktree-state-sources.md`):

- A chat needs attention while a request waits. An ended turn, a cancelled one included, leaves it Idle; a failed one leaves it in Error until its next turn.
- Failed steps stay in Error until a turn starts in the worktree or steps run again.
- The user marks a worktree other than the main checkout done, or not done, from the palette (Mark worktree done). A turn or steps starting take the mark off.
- When core starts, a turn that was under way counts as over, and steps that were running count as failed.

Alt A (Next worktree that needs attention) opens the next one in the left menu's order, across projects, wrapping around.

**Git operations**

All worktrees of a project share one `.git` directory. The core git service queues operations that touch shared state (worktree add and remove, fetch, gc, branch delete, ref updates) per repository, so two worktrees never race on a lock file. Read-only and worktree-local commands such as status and diff run without the queue.

**Project overview**

Each project has an overview page, opened by selecting the project in the left menu. Until M4 it is a placeholder with the project's folder, its default branch and a button that opens it. In M4 it shows the worktree list with state, branch, changes and cost, plus issue-tracker stats and the issue list when a connector is configured. Each issue row can start a new worktree.
