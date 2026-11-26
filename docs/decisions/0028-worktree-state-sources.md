# 0028 Worktree state: sources and how long each keeps its state

Status: decided, 2026-11-26.

Context: `docs/spec/02-worktrees.md` names the five states, what sets them and the order that combines them, but not when Error and Done end, whether setup counts as Running, or what a restart does to work under way.

Decision:
- Setup and teardown steps are a source of their own: Running while they run, Error when they fail.
- A chat's Error lasts until that chat's next turn. Failed steps end with the next turn in the worktree or the next steps run, since M2 has no way to run them again.
- The done mark is the user's, and a turn or steps starting remove it: a worktree being worked in is not ready to finish.
- On start core treats a turn under way as over (Idle) and running steps as failed, as it records them when it quits. Errors and the done mark survive.
- Core logs its own small events for turns, requests and the done mark, not the agent's events, which would put transcripts in the event log.

Rejected: a command that dismisses an error, which hides a failure although nothing has changed; keeping the done mark across new work, so an old mark would come back after each turn.

Consequences: until chats are restored (M2 step 7), a chat that failed before a restart cannot take another turn, so its worktree stays in Error.
