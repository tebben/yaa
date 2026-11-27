# 0037 Settled worktrees replace closing without removing

Status: decided, 2026-11-27.

Context: finishing offered "close it, keep the folder and the branch", which deleted the worktree's row. The folder, its branch and, since session restore, its chats stayed behind with nothing in yaa pointing at them: the user could not see, reopen or later remove them. The user asked for a settle option and for what removing a worktree should do.

How others do it (checked 2026-11-27):
- Orca: Delete removes the folder and the branch, with confirmation and a force delete when git refuses; a branch with unmerged commits gets a review step. Sleep closes a worktree's terminals and agents and keeps resumable sessions; a sleeping worktree stays in the sidebar, behind a filter, and opening it relaunches its agents with their resume flags. Archive is documented only as removal. ([docs](https://orca.dev/docs/model/worktrees), [sleep](https://orca.dev/docs/agents/hibernation))
- T3 Code: threads are archived, hidden from the sidebar and listed in settings to unarchive or delete; the worktree is removed only when a thread is deleted, after asking, and the branch stays. ([PR 1359](https://github.com/pingdotgg/t3code/pull/1359), [git workflow guide](https://www.mintlify.com/pingdotgg/t3code/guides/git-workflow))

Decision:
- **Settle** is the finish choice that keeps the folder, in place of closing. A settled worktree keeps its row, branch, index, chats, layout and terminals' directories; its agents, terminals, file watches and setup end, as in Orca's sleep.
- **Shown, folded.** A project's settled worktrees sit under a Settled row below its branch graph, folded at first, outside Alt J, Alt K and Alt A. Rejected: hiding them in settings, as T3 Code does, which puts a worktree with uncommitted work out of sight.
- **Reopen** by selecting one, its button, or the palette; refused when the folder is gone. Its chats resume their agents on demand (`docs/decisions/0036-session-restore.md`).
- **Remove** stays the only way a folder goes: a settled worktree's remove button offers the removing choices of finish, with the same warnings and overrides.
- Rejected: forgetting a worktree and keeping its folder, which is how stray folders were left before.

Consequences: the finish action `close` is now `settle`, and worktrees carry `settled` in the protocol. A settled worktree still holds its index, so its ports stay free for it. Removing a project still forgets all its worktrees, settled ones included, and leaves their folders.
