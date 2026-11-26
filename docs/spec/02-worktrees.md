<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Projects and worktrees

A project is a git repository added by folder. A worktree is the unit of work: it owns a branch, a working directory, open tabs, a panel layout, terminals, chat sessions and a usage ledger. Switching worktrees swaps all of that at once; agents in other worktrees keep running in the background.

**Lifecycle**

- **Create:** from the default branch or any branch; from a ticket in the issue tracker; or by ticket id typed into the command palette. Worktrees are created under a configurable directory, by default a sibling folder of the repository (assumption).
- **Naming:** a per-project strategy decides the branch and folder name: a template such as `{prefix}{ticketId}-{slug}`, a default prefix so that typing `123` resolves to `PROJ-123`, or an LLM-generated name from a prompt the user sets for the project.
- **Switch:** a keybinding cycles worktrees, and the left menu jumps to any of them.
- **Finish:** one action closes the worktree. It warns about uncommitted or unpushed work, then optionally removes the worktree directory and deletes the local branch (and the remote branch when the user confirms). A dirty worktree is never removed without an explicit override.

**State**

State is derived from events, not polled, and shown as a badge in the left menu, in the footer and in the project overview.

| State | Set by | Meaning |
| --- | --- | --- |
| Idle | no running turn | nothing is happening |
| Running | agent turn started | an agent is working |
| Needs attention | agent question or permission request | the agent is blocked on the user |
| Error | provider or tool failure | the last turn failed |
| Done | user, or PR merged | ready to finish |

A key jumps to the next worktree that needs attention.

**Project overview**

Each project has an overview page that shows the worktree list with state, branch, changes and cost, plus issue-tracker stats and the issue list when a connector is configured. Each issue row can start a new worktree.
