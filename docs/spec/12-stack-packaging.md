<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Tech stack and performance

Lands in: M1; targets measured from M1 on.

The UI stack is decided; the rest is proposed and confirmed in milestones 0 and 1.

| Layer | Choice | Status |
| --- | --- | --- |
| Desktop shell | Electron, so Chromium renders the same on every OS | proposed |
| UI | Svelte 5, Bits UI, Tailwind | decided |
| Dock grid | `dockview-core` behind our own Svelte adapter (`docs/decisions/0016-dock-grid-dockview.md`) | decided |
| Editor | Monaco | decided |
| Chat transcript | virtua for virtualization, marked parsing into Svelte elements, Shiki highlighting lazily, jsdiff for inline diffs (`docs/decisions/0034-chat-plugin.md`) | decided |
| Backend | TypeScript on Electron's Node in a `utilityProcess`, typed protocol over `MessagePort` (`docs/decisions/0018-core-transport-messageport.md`) | decided |
| Agents | ACP first, provider-specific fallback | proposed |
| Storage | JSON settings files (`docs/decisions/0020-settings-files-json.md`); one SQLite database for the event log, transcripts, runs, annotations, layouts and the usage ledger, with migrations | decided |
| Runtime validation | Zod 4 in `contracts` for protocol messages, manifests and settings (`docs/decisions/0013-zod-schemas.md`) | decided |
| Build | Vite for the renderer; esbuild bundles main, the preload, the core and the plugin host; the yaa plugin build (esbuild plus the Svelte compiler) builds plugins; `pnpm run dev` drives them all | in use since M1 |
| Packaging | electron-builder | proposed |
| Lint, format, tests | Biome, `tsc` (TypeScript 6, since `svelte-check` 4 does not support 7), `svelte-check`, Vitest | in use since the repo foundation |

**Tooling and assets (proposed)**

- **Package manager and runtime:** pnpm workspaces and Node (`docs/decisions/0002-pnpm-and-node.md`).
- **SQLite binding (decided):** Node's built-in `node:sqlite` in Electron's Node, imported only by the core's storage module (`docs/decisions/0019-native-modules-node-sqlite.md`).
- **Native modules (decided):** node-pty is the only one. Native dependencies must be N-API, so they load in Electron without `@electron/rebuild`; electron-builder's rebuild step is off. pnpm's `allowBuilds` lists `node-pty` and `electron`. node-pty compiles on install, which needs python3, make and a C++ compiler.
- **Icons:** `@lucide/svelte`, the Svelte 5 build of Lucide (ISC license), imported per icon so unused icons are tree-shaken. Plugins use the same set through `ui`.
- **Fonts:** bundled with the app, not fetched, so the app works offline: Geist Sans for the interface and Geist Mono for code and the terminal. Geist is free and open source under the SIL Open Font License, so it can be bundled and redistributed. The variable fonts come from `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`, whose stylesheets name the families `Geist Variable` and `Geist Mono Variable`; the official `geist` package is built for Next.js and does not export its font files. The font family is a theme token, so a theme can change it. Icons and fonts ship with their licence files.
- **Platform:** x64 Linux only for now; arm64 is out of scope.

A Rust backend is not needed: the work is waiting on agents, git and the network. Rust enters only as a native module or sidecar if a measured bottleneck appears, for example file watching on very large repositories.

**Performance targets**

These are proposed targets, measured from milestone 1 on. The smoke test (`docs/spec/13-repo-conventions.md`) reports launch and palette open times on every run and fails only when a step fails, since shared CI runners are too noisy to gate on (`docs/decisions/0022-smoke-test.md`). The window counts as interactive once the dock is on screen, which the renderer marks as `yaa:interactive`.

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
- **Display servers:** Electron uses Wayland natively when available and X11 otherwise. Test both from the first build, and the AppImage on a real Ubuntu 24.04 host before the first release.
- **Chromium sandbox:** the AppImage's launcher adds `--no-sandbox` where unprivileged user namespaces are blocked, as on stock Ubuntu 23.10 and later; the deb installs an AppArmor profile that keeps the sandbox on. The app never adds `--no-sandbox` itself, and the doctor reports when it runs without the sandbox (`docs/spec/11-platform-services.md`).
- **glibc:** releases run on Ubuntu 22.04 (glibc 2.35) and later. Artifacts are built in a container with glibc 2.36 or older, because node-pty links against the build machine's glibc, and the release job fails if a bundled `.node` file needs a newer glibc than 2.35.
- **CI and releases:** GitHub Actions. From the repo foundation on, every push and pull request runs `pnpm run check:all` on a Linux runner, and a red check blocks merging to `main`. From M6, a version tag also builds the Linux artifacts, writes SHA256 checksums and attaches both to a GitHub release.
