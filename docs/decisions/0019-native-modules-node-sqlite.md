# 0019 Native modules: node:sqlite, node-pty without rebuilds, releases built on old glibc

Status: decided, 2026-11-26. M0 spike, branch `spike/native-modules` (code and results in `spikes/native-modules/`, kept for reference, not merged).

Context: the core needs SQLite (`docs/spec/11-platform-services.md`) and node-pty (`0017-terminal-xterm-first.md`) inside an Electron `utilityProcess` (`0018-core-transport-messageport.md`). Open were the SQLite binding, how native modules build for Electron with pnpm, whether electron-builder packages them from a pnpm workspace, and whether the AppImage starts on Wayland.

Versions: Electron 45.5.0 (Node 24.22.3, SQLite 3.54.1, N-API 10), pnpm 12.11.2, electron-builder 26.18.0, better-sqlite3 13.2.0, node-pty 1.1.0. Arch Linux host (glibc 2.44) on Wayland, plus Ubuntu 22.04 and 24.04 in containers.

## Findings

- **`node:sqlite` works in Electron's Node without a flag**, in main and in a `utilityProcess`, and printed no experimental warning. It has `DatabaseSync`, `StatementSync`, sessions and `backup`.
- **It is faster than better-sqlite3** in the utility process (5 packaged runs, median): 100k inserts in one transaction with WAL took 64 ms against 107 ms; a GROUP BY over them took 13.5 ms against 14.2 ms; opening took 0.5 ms against 2.7 ms. Both bundle SQLite 3.54.1.
- **No Electron rebuild is needed.** better-sqlite3 13 and node-pty 1.1 are both N-API modules (`napi_register_module_v1`), so a binary built for plain Node loads in Electron. `electron .` loaded them straight after `pnpm install`, with no `@electron/rebuild` step. better-sqlite3 13 ships prebuilds for each platform; node-pty has no Linux prebuilds and compiles with node-gyp on install, so it needs python3, make and a C++ compiler.
- **pnpm needs no special linker.** The default isolated `node_modules` worked. `allowBuilds` must allow `node-pty` and `electron`; electron-builder pulls in `electron-winstaller`, whose script can be denied. electron-builder found the workspace root from `packageManager`, collected the workspace package's dependencies through pnpm, and moved the `.node` files to `app.asar.unpacked` by itself.
- **node-pty is linked against the build machine's glibc.** Built on Arch it needed `GLIBC_2.42` (`cfsetospeed`), and failed to load on Ubuntu 22.04 (glibc 2.35) and 24.04 (2.39). Built in `node:24-bookworm` (glibc 2.36) it needed only 2.34 and worked on both. Electron's own binary needs 2.25, the better-sqlite3 prebuild 2.34.
- **The AppImage starts on Wayland natively.** Electron 45 picked the Wayland backend (`ozone-platform=wayland`) with no flag, also with `DISPLAY` unset, and used X11 with `WAYLAND_DISPLAY` unset or `--ozone-platform=x11`. All probes passed in each case. In Ubuntu 22.04 and 24.04 containers, with a desktop's runtime libraries, it started and all probes passed (bookworm build).
- **The AppImage turns the Chromium sandbox off where user namespaces are blocked.** electron-builder's `AppRun` runs `unshare -Ur true` and adds `--no-sandbox` when that fails. Stock Ubuntu 23.10 and later block unprivileged user namespaces through AppArmor unless a profile allows the app. In a container with user namespaces blocked, the app started with `--no-sandbox` and the renderer had no user namespace of its own; with them allowed, and on the Arch host, it ran sandboxed. The deb's `postinst` installs an AppArmor profile, so the deb keeps the sandbox on Ubuntu. Electron's `sandbox: true` web preference still reports `process.sandboxed`, which says nothing about the OS sandbox.
- **AppImageLauncher**, where installed, moves an AppImage to `~/Applications` and adds a desktop entry on first start. `APPIMAGELAUNCHER_DISABLE=1` stops it.
- Packaging with `npmRebuild: false` produced the same working app.
- Not verified: AppArmor on a real Ubuntu 24.04 host (the container used Docker's seccomp filter to block user namespaces), installing the deb and rpm, GPU acceleration in Ubuntu (the containers had no GPU and fell back to software).

## Decision

- **SQLite:** the core uses `node:sqlite`. It needs no native module, no prebuild and no glibc care, and it is faster here. Only the core's storage module imports it, so a change in its API between Node releases touches one place. Rejected: better-sqlite3, which works as well but adds a native dependency for no gain. It stays the fallback if `node:sqlite` regresses.
- **Native modules:** node-pty is the only native module. No `@electron/rebuild` in dev, CI or packaging scripts, and electron-builder's rebuild step is turned off (`npmRebuild: false`). A new native dependency must be N-API, or it needs its own decision.
- **pnpm:** default isolated linker; `allowBuilds` lists `node-pty` and `electron`.
- **Releases** are built in a container with glibc 2.36 or older (Debian bookworm), not on the newest runner, so they run on Ubuntu 22.04 and later. The release job checks that no bundled `.node` file needs a newer glibc than 2.35.
- **Sandbox:** the AppImage stays a first target. At startup the app checks whether it runs with `--no-sandbox`, and the doctor reports a disabled sandbox and how to fix it: on Ubuntu, install the deb, or add an AppArmor profile for the AppImage. The app never adds `--no-sandbox` itself.

## Consequences

- M1: the core opens the database with `node:sqlite` inside its `utilityProcess` and runs migrations with `PRAGMA user_version`. No native module enters until M3.
- M3: node-pty goes into the core; it already loads and spawns a PTY in a `utilityProcess` (one of the open items in `0017-terminal-xterm-first.md`). Contributors and CI need python3, make and a C++ compiler for its install.
- M6: the release job builds in a bookworm container and checks glibc versions; the deb keeps electron-builder's AppArmor profile; the doctor gets the sandbox check; test the AppImage on a real Ubuntu 24.04 host and on X11.
