# Native modules spike (M0)

Question: do node-pty and a SQLite binding work in Electron's main process and in a `utilityProcess` (the core, `0018-core-transport-messageport.md`) with pnpm, does electron-builder package them from a pnpm workspace, and does the AppImage start on Wayland? Result: `docs/decisions/0019-native-modules-node-sqlite.md`.

Layout: a pnpm workspace like the real repo. `packages/core` depends on `better-sqlite3` and `node-pty` and exports `probeAll()`, which benchmarks `node:sqlite` and `better-sqlite3` (100k inserts in one transaction, WAL, a GROUP BY) and spawns a PTY. `apps/desktop` runs the probes in main and in a `utilityProcess`, opens a sandboxed window, records the renderer's OS sandbox state and writes everything as JSON.

Run:
- `pnpm install`, then `cd apps/desktop && SPIKE_OUT=/tmp/r.json pnpm start`
- Package on the host: `pnpm run dist` in `apps/desktop` (AppImage and deb in `dist/`)
- Package in Debian bookworm (glibc 2.36): `./build-in-container.sh` (AppImage in `apps/desktop/dist-bookworm/`)
- Run an AppImage in Ubuntu: `docker build -t yaa-spike-ubuntu -f Dockerfile.ubuntu .` (pass `--build-arg BASE=ubuntu:22.04 --build-arg GTK=libgtk-3-0 --build-arg ASOUND=libasound2` for 22.04), then run `ubuntu-run.sh` in it with the Wayland socket mounted. Docker's default seccomp profile blocks user namespaces, which stands in for Ubuntu's AppArmor rule; `--security-opt seccomp=unconfined` allows them.
- On a machine with AppImageLauncher, set `APPIMAGELAUNCHER_DISABLE=1` or it moves the AppImage to `~/Applications`.

`results/`: JSON per run. `appimage-*` are the bookworm-built AppImage on the Arch host (Wayland, X11, Wayland without `DISPLAY`); `ubuntu<ver>-<build>-<blocked|userns>` are runs in Ubuntu containers of the Arch-built (`arch`) and bookworm-built AppImage.
