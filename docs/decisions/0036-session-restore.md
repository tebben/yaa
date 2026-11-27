# 0036 Session restore: stored chats, agents started on demand

Status: decided, 2026-11-27.

Context: M2 step 7 reopens worktrees with their chats and marks interrupted turns (`docs/spec/11-platform-services.md`). Open were when restored chats get their agents back, how a resume shows in the transcript, and where the window opens.

Decision:
- **Storage.** Core stores each chat with the agent's session id and every normalized event, in order, in `chats` and `chat_events`. Transcripts stay out of the event log (`docs/decisions/0028-worktree-state-sources.md`).
- **Agents on demand.** A restored chat has no agent until its next prompt or option change, which starts one and resumes the session. Rejected: resuming every chat at start, which would spawn an agent per chat on each launch, about 2 s and a process each (`docs/decisions/0014-acp-coverage.md`). A crashed agent comes back the same way.
- **Resume method.** `session/resume` when the agent advertises it, else `session/load` with its replay dropped, else the prompt fails with the reason. Claude Code's adapter advertises both; the fake agent resumes any id.
- **Events.** `resuming` starts a resume, which the session's `capabilities` event ends, and `interrupted` closes a turn or resume that was under way when core stopped. The chat counts a resume as running, so a second prompt cannot race it.
- **Window.** Core stores the last place, overview or worktree, under `app_state`; the renderer opens it if still listed, else the first project's main checkout.

Consequences: the first prompt after a restart waits for the agent to start. Which chat a chat panel shows is not stored: it opens on the worktree's latest chat.
