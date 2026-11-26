# 0002 Package manager and runtime: pnpm and Node

Status: decided, 2026-11-26.

Context: the backend ships inside Electron, which runs Node. Native modules such as node-pty and the SQLite binding are rebuilt for Electron's Node.

Decision: pnpm workspaces with Node as the runtime. Bun is not the runtime; it may be used later as a script or test runner.

Consequences: `AGENTS.md` commands use `pnpm`. The M0 native-modules spike still checks the pnpm and electron-builder setup for native modules.
