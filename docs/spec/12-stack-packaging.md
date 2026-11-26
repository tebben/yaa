<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Tech stack and performance

Lands in: M1; targets measured from M1 on.

The UI stack is decided; the rest is proposed and confirmed in milestones 0 and 1.

| Layer | Choice | Status |
| --- | --- | --- |
| Desktop shell | Electron, so Chromium renders the same on every OS | proposed |
| UI | Svelte 5, Bits UI, Tailwind | decided |
| Editor | Monaco | decided |
| Code in chat | Shiki, highlighted lazily | proposed |
| Backend | TypeScript on Node, a separate process, typed protocol; transport in `00-overview.md` | proposed |
| Agents | ACP first, provider-specific fallback | proposed |
| Storage | JSON settings files; one SQLite database for the event log, transcripts, runs, annotations, layouts and the usage ledger, with migrations | proposed |
| Runtime validation | Zod 4 in `contracts` for protocol messages, manifests and settings (`docs/decisions/0013-zod-schemas.md`) | decided |
| Packaging | electron-builder | proposed |
| Lint, format, tests | Biome, `tsc`, `svelte-check`, Vitest | proposed |

**Tooling and assets (proposed)**

- **Package manager and runtime:** pnpm workspaces and Node (`docs/decisions/0002-pnpm-and-node.md`).
- **SQLite binding:** Node's built-in `node:sqlite` would avoid a native module, if the Node version inside Electron ships it without a flag. Otherwise `better-sqlite3`, rebuilt for Electron. Unverified; the M0 native-modules spike decides.
- **Icons:** `@lucide/svelte`, the Svelte 5 build of Lucide (ISC license), imported per icon so unused icons are tree-shaken. Plugins use the same set through `ui`.
- **Fonts:** bundled with the app, not fetched, so the app works offline: Geist Sans for the interface and Geist Mono for code and the terminal. Geist is free and open source under the SIL Open Font License, so it can be bundled and redistributed. The font family is a theme token, so a theme can change it. Icons and fonts ship with their licence files.
- **Platform:** x64 Linux only for now; arm64 is out of scope.

A Rust backend is not needed: the work is waiting on agents, git and the network. Rust enters only as a native module or sidecar if a measured bottleneck appears, for example file watching on very large repositories.

**Performance targets**

These are proposed targets, measured from milestone 1 on.

| Measure | Target |
| --- | --- |
| Window interactive after launch | 1.5 s or less on a mid-range laptop |
| Worktree switch, layout repainted | under 100 ms |
| Command palette open | under 50 ms |
| Chat streaming | batched to one render per animation frame, no dropped frames |

**Techniques**

- Virtualize long lists: transcripts, file trees, diffs, issue lists.
- Highlight lazily and off the critical path, with a plain-text fallback for large files.
- Load plugins on their activation events, not at startup.
- Keep agent, git and file-watching work out of the renderer; the UI only subscribes to events.

## Packaging and distribution (Linux first)

Lands in: M6.

Linux is the first supported platform. The code carries no Linux-only assumptions, so macOS and Windows follow without a rewrite.

- **Tooling:** electron-builder, which [supports AppImage, deb, rpm, snap, flatpak and pacman on Linux](https://www.electron.build/docs/targets).
- **First targets:** AppImage (one file, no install, runs across distros, not sandboxed), plus deb and rpm for apt and dnf users. Flatpak, Snap and pacman come later, driven by demand.
- **Architectures:** x64 only. arm64 is out of scope.
- **Updates:** none in the first release. Users download the new AppImage, deb or rpm from the release page, and the app can show a notice when a newer version exists. Auto-update through electron-updater comes later.
- **Desktop integration:** a desktop entry with icon and categories, and a URL scheme handler for deep links, for example opening a worktree from a link.
- **Runtime dependencies:** `git` on the PATH is required. Agent CLIs, `gh` and `glab` are detected at runtime and never bundled, and the app says what is missing and how to install it.
- **Display servers:** test on both Wayland and X11 from the first build. Also check recent Ubuntu releases for sandbox startup problems with the AppImage, before the first release.
- **CI and releases:** GitHub Actions. From the repo foundation on, every push and pull request runs `pnpm run check:all` on a Linux runner, and a red check blocks merging to `main`. From M6, a version tag also builds the Linux artifacts, writes SHA256 checksums and attaches both to a GitHub release.
