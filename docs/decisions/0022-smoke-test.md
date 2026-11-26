# 0022 Smoke test and the M1 measurements

Status: decided, 2026-11-26.

Context: the M1 exit check (`docs/plan.md`, step 9) asks for the smoke test and for launch and palette open times against the targets in `docs/spec/12-stack-packaging.md`. Three choices were open: what drives the app, how it gets the fake agent (a dev-only provider) without the Vite dev server, and whether slow timings fail the build.

Decision:
- **Driver.** `apps/desktop/scripts/smoke.ts` launches the built app with `--remote-debugging-port=0` and a new `--user-data-dir`, and drives it with a small DevTools protocol client over Node's own `WebSocket` (`scripts/cdp.ts`). Rejected: Playwright's Electron support, a large dependency for four steps that still needs the same flags, and which is marked experimental.
- **Dev mode is its own switch.** `YAA_DEV=1` turns on dev mode (the `yaa-dev` data folder, debug logs, the fake agent); `YAA_DEV_SERVER_URL` only says where the renderer comes from. `pnpm run dev` sets both; the smoke test sets only `YAA_DEV`, so it runs the production renderer bundle with the fake agent. Rejected: running the smoke test against the Vite dev server, whose on-demand transforms would distort the launch time.
- **Steps.** The app starts, the palette runs the hello plugin's command (checked in the log file), and the fake agent's edit turn plays to its end with the permission allowed and the question declined. The worktree step joins in M2.
- **Timings are reported, not gated.** Launch is measured from spawning Electron to the renderer's `yaa:interactive` mark (the dock on screen), once with a new data folder and as the median of three launches on the same folder. Palette open is measured in the page from the key's event to the frame after the palette is in the DOM, as the median of five. Shared CI runners vary too much for a time limit to be a reliable failure. A step that fails or times out (15 s) fails the run.
- **CI.** The `check` job runs `pnpm run smoke` under `xvfb-run`, after allowing unprivileged user namespaces, which Ubuntu 24.04 blocks and the Chromium sandbox needs. The app keeps its sandbox on.

M1 measurements, Electron 45.5.0, dev mode, production renderer:

| Machine | First launch | Launch (median of 3) | Palette open (median of 5) |
| --- | --- | --- | --- |
| Desktop, Ryzen AI Max+ 395, 32 threads, Wayland | 314 ms | 326 ms | 7 ms |

Both are well inside the targets (1.5 s, 50 ms). The desktop is faster than the mid-range laptop the launch target names, so the margin there is smaller than these numbers suggest.

Consequences: the smoke run adds about half a minute to CI. Timing regressions show in the CI log, not as a failure, so they are found by reading it at milestone exit checks. The smoke test depends on visible text and ARIA labels (the palette's dialog label, the prompt input, button names); renaming them breaks it, which is the point.
