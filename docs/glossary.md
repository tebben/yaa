# Glossary

One line per term. Code, specs and agents use these names; add a term when a new concept needs a fixed name.

- **Project:** a git repository added to yaa by folder.
- **Worktree:** a git worktree of a project; the unit of work, with its own branch, layout, terminals, chats and usage.
- **Default branch:** the project's main branch, shown as the trunk in the left menu.
- **Main checkout:** the project's own folder, where the default branch is checked out; its first worktree, with index 0, which cannot be finished.
- **Finish:** closing a worktree, optionally removing its folder and deleting its branch.
- **Provider:** a plugin that connects one agent CLI; supplies detection, spawn configuration and capabilities.
- **Capability:** something a provider declares it supports, such as resume or skill toggling; the UI hides what is not declared.
- **Session:** one running agent process with its ACP connection, owned by core, shown as a chat.
- **Turn:** one user message and the agent's work until it ends, fails or is cancelled.
- **Worktree state:** Idle, Running, Needs attention, Error or Done, derived from events.
- **Event log:** the append-only record of core events in SQLite that state is derived from.
- **Annotation:** a comment on a line range in a diff or file, sent to the agent as review.
- **Connector:** a plugin that implements the source-control or issue-tracker interface.
- **Contribution point:** a registry a plugin adds to, such as panels, commands or chat renderers.
- **Workflow:** a named definition of steps started by a trigger. A **run** is one execution of it.
- **Trigger:** what starts a run: manual, event or sensor. A **sensor** polls a connector and emits events.
- **Step mode:** `auto` runs without stopping; `review` waits for approval.
- **Setup steps:** per-project files to copy and commands to run when a worktree is created.
- **Teardown steps:** per-project commands to run before a worktree's folder is removed.
