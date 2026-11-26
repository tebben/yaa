<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Projects and worktrees

Lands in: M2. Creating from a ticket, Done on PR merge and the project overview: M4.

A project is a git repository added by folder. A worktree is the unit of work: it owns a branch, a working directory, open tabs, a panel layout, terminals, chat sessions and a usage ledger. Switching worktrees swaps all of that at once; agents in other worktrees keep running in the background.

**Lifecycle**

- **Create:** from the default branch or any branch; from a ticket in the issue tracker; or by ticket id typed into the command palette. Worktrees are created under a configurable directory. The default is a central folder, `~/.local/share/yaa/worktrees/<project>/<worktree>` (`docs/decisions/0010-worktree-location.md`).
- **Naming:** a per-project strategy decides the branch and folder name: a template such as `{prefix}{ticketId}-{slug}`, a default prefix so that typing `123` resolves to `PROJ-123`, or an LLM-generated name from a prompt the user sets for the project.
- **Switch:** a keybinding cycles worktrees, and the left menu jumps to any of them.
- **Setup and teardown:** a new worktree has no `node_modules`, `.env` or build output. Each project defines setup steps that run after create: files to copy from the main checkout (globs, for example `.env*`) and commands to run in the worktree (for example `pnpm install`). Teardown commands run before remove. Output goes to a terminal in the worktree, and a failed step sets the worktree to Error without removing it. The steps live in project settings, or in a project file that may be committed with the repository.
- **Ports:** each worktree gets a stable index, exposed to setup steps, terminals and agents as `YAA_WORKTREE_INDEX`, so a project can offset dev-server ports and run several worktrees at once.
- **Finish:** one action closes the worktree. It warns about uncommitted or unpushed work, then optionally removes the worktree directory and deletes the local branch (and the remote branch when the user confirms). A dirty worktree is never removed without an explicit override.

**State**

State is derived from events, not polled, and shown as a badge in the left menu, in the footer and in the project overview. Core writes those events to an append-only event log in SQLite, so the derived state is the same after a restart.

| State | Set by | Meaning |
| --- | --- | --- |
| Idle | no running turn | nothing is happening |
| Running | agent turn started, or a workflow step running | an agent or a run is working |
| Needs attention | agent question or permission request, or a run waiting for approval | the agent or run is blocked on the user |
| Error | provider or tool failure, crashed agent, failed setup step | the last turn or step failed |
| Done | user, or PR merged | ready to finish |

A worktree can have several chats and workflow runs. Each source has its own state, and the worktree shows the highest one in this order: Needs attention, Error, Running, Done, Idle. The reducer from events to state, and this ordering, are pure functions with unit tests.

A key jumps to the next worktree that needs attention.

**Git operations**

All worktrees of a project share one `.git` directory. The core git service queues operations that touch shared state (worktree add and remove, fetch, gc, branch delete, ref updates) per repository, so two worktrees never race on a lock file. Read-only and worktree-local commands such as status and diff run without the queue.

**Project overview**

Each project has an overview page that shows the worktree list with state, branch, changes and cost, plus issue-tracker stats and the issue list when a connector is configured. Each issue row can start a new worktree.
