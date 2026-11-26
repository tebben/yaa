<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Projects and worktrees

Lands in: M2. Creating from a ticket, Done on PR merge and the project overview: M4.

A project is a git repository added by folder, chosen with the system's folder picker, which Electron main shows for the core. Any folder in the repository adds the repository by its main checkout; a folder outside a repository, a bare repository or a project already in the list is refused with the reason. The project list lives in the database, in the order added; removing a project takes it off the list and leaves its folder alone. The default branch is the one `origin/HEAD` points at, or, without it, the branch checked out in the main checkout when the project is added. A worktree is the unit of work: it owns a branch, a working directory, open tabs, a panel layout, terminals, chat sessions and a usage ledger. A project's main checkout is its first worktree, which cannot be finished; the others are the ones yaa created, listed oldest first. Removing a project forgets its worktrees and leaves their folders alone. Switching worktrees swaps all of that at once; agents in other worktrees keep running in the background. Each worktree keeps its own dock grid, created the first time it opens and kept while the app runs, so its panels are as they were when you switch back; its layout is saved with it and goes when it is finished. Until session restore (M2), the window opens on the first project's main checkout.

**Lifecycle**

- **Create:** from the default branch or any branch; from a ticket in the issue tracker; or by ticket id typed into the command palette. New worktree (Ctrl Shift N, or the branch button on a hovered project) asks for a name in the palette and shows the branch it will make as you type; New worktree from branch first picks the branch, local or remote, to start from. A named worktree gets a new branch from that start without tracking it; with the name left empty, a branch other than the default one is checked out itself, a remote one as a local branch that tracks it. A branch name that exists, a folder that exists or a git failure is refused with the reason, and nothing is added. Worktrees are created under a configurable directory, the `worktree.directory` setting. The default is a central folder, `~/.local/share/yaa/worktrees/<project>/<worktree>` (`docs/decisions/0010-worktree-location.md`).
- **Naming:** a per-project strategy decides the branch and folder name: a template such as `{ticketId}-{slug}`, a default prefix so that typing `123` resolves to `PROJ-123`, or an LLM-generated name from a prompt the user sets for the project. A ticket id at the start of the name (`123` or `geo-12`, upper-cased to `GEO-12`) fills `{ticketId}`, the bare number with the default prefix in front; the rest becomes the slug, lower case ASCII words joined by `-`, cut to 48 characters at a word. The separators next to an empty part drop out, and the folder is the branch with each `/` as `-`. In M2 the template and the prefix are the app settings `worktree.branchTemplate` and `worktree.ticketPrefix`; the project layer (M6, `11-platform-services.md`) makes them per project. The LLM-generated name arrives with the generated text model (`docs/decisions/0007-generated-text-model.md`).
- **Switch:** Alt J and Alt K go to the next and previous worktree in the left menu's order, across projects, and the left menu jumps to any of them.
- **Setup and teardown:** a new worktree has no `node_modules`, `.env` or build output. Each project defines setup steps that run after create: files to copy from the main checkout (globs, for example `.env*`) and commands to run in the worktree (for example `pnpm install`). Teardown commands run before remove. Output goes to a terminal in the worktree (in M2, before the terminal, to the debug panel: `docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md`), and a failed step sets the worktree to Error without removing it. The steps live in project settings, or in a project file that may be committed with the repository.
- **Ports:** each worktree gets a stable index, exposed to setup steps, terminals and agents as `YAA_WORKTREE_INDEX`, so a project can offset dev-server ports and run several worktrees at once. The main checkout is 0; a created worktree gets the lowest number from 1 up that no other worktree of the project holds, and keeps it until it is finished.
- **Finish:** one action closes the worktree (Finish worktree in the palette, or the button on a hovered worktree). It warns about uncommitted changes and about commits on its branch that are neither on a remote nor on the default branch, then offers, each step including the ones before: close it and keep the folder and branch, remove the folder, delete the local branch, and delete the branch on its upstream's remote when it has one. When work would be lost, the choices that keep it come first, and the ones that lose it say what they lose; picking one is the explicit override (`git worktree remove --force`, `git branch -D`), so a dirty worktree is never removed without it. A folder already removed outside yaa is pruned from git's records. Once the folder is gone the worktree is off the list, even when deleting a branch then fails; that failure is reported. Finishing the open worktree opens the project's main checkout.

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

Each project has an overview page, opened by selecting the project in the left menu. Until M4 it is a placeholder with the project's folder, its default branch and a button that opens it. In M4 it shows the worktree list with state, branch, changes and cost, plus issue-tracker stats and the issue list when a connector is configured. Each issue row can start a new worktree.
