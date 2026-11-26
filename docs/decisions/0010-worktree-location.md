# 0010 Worktree location: central folder

Status: decided, 2026-11-26.

Context: sibling folders of the repository clutter its parent directory and get picked up by tools that scan it.

Decision: worktrees are created under `~/.local/share/yaa/worktrees/<project>/<worktree>` by default. The directory is configurable.

Consequences: worktree paths do not sit next to the repository, so relative paths between the main checkout and a worktree cannot be assumed.
