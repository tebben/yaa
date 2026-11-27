# 0042 Worktree switch and chat streaming: how they are measured, and M2's numbers

Status: decided, 2026-11-27.

Context: the M2 exit check (`docs/plan.md`, step 12) asks the smoke test to open a worktree and to measure worktree switch time and chat streaming against the targets in `docs/spec/12-stack-packaging.md`. It extends the smoke test of `0022-smoke-test.md`, whose rule holds: timings are reported, not gated.

Decision:
- **Setup.** The smoke test opens a second worktree, where the fake agent plays `/stream`: about 13,000 characters of headings, lists and code in 24-character pieces, 4 ms apart, so several arrive in each frame. It then switches between that worktree and the main checkout, which has editor tabs, a terminal, the files panel and a chat. The window is sized to 1440 × 900 while timing switches and streaming, so the screen does not change the numbers.
- **Worktree switch.** From the key's event to the frame after the header names the other branch and its grid holds the end of its chat's last reply. Reported as the median of 11 switches between two grids already built, and apart from that as the median of the first switch after each of three launches, which builds the grid from its saved layout and reads its chat.
- **Chat streaming.** The time between frames from the first text of the reply to its end. A frame counts as dropped for each frame period, the median gap, that passed without one. Rejected: counting DOM changes per frame to check the batching, since code highlighting and the virtual list change the transcript on their own; the chat applies events once a frame by construction (`plugins/chat/lib/sessions.svelte.ts`).

M2 measurements, Electron 45.5.0, dev mode, production renderer:

| Machine | Switch (median of 11) | First visit after a launch (median of 3) | Streaming |
| --- | --- | --- | --- |
| Desktop, Ryzen AI Max+ 395, 32 threads, Wayland, 9 runs | 17–26 ms | 80–95 ms | no dropped frames, longest 9 ms at 120 Hz and 17 ms at 60 Hz |

Switching between built grids is well inside the 100 ms target. The first visit after a launch is only just inside it on this desktop, which is faster than a mid-range laptop. Launch (323–351 ms) and palette open (6–15 ms) stay inside their targets with M2's features.

Consequences: the first switch to a worktree after a launch is the timing to watch; M3 measures switching again with more panels open (`docs/plan.md`, M3 step 13). Real agents send fewer, larger pieces than the fake one, and their streaming is not measured.
