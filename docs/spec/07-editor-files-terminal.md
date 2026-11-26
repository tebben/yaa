<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Editor, files and terminal

Lands in: M3.

**Editor**

- Monaco with tabs per worktree: a reusable preview tab, pinned tabs, a dirty marker, keys for next and previous tab, close and reopen, and quick-open by fuzzy path. Diffs open as tabs too.
- Plugins can add decorations, gutter actions and widgets, and commands scoped to the editor.
- Vim keys are optional (see `01-ui-layout-theming.md`).

**Files panel**

- A tree of the active worktree, navigable with arrow or vim keys, with expand and collapse, and open on Enter.
- A filter box narrows the tree by fuzzy path match, and a key focuses it.
- The file list comes from `git ls-files` plus untracked files and is kept fresh by a file watcher, so large repositories list quickly and ignored files stay hidden unless toggled on. Files carry git status decorations.
- Basic operations: new file, rename and delete, with confirmation.

**Terminal**

- Terminals open from the palette or a key, one or more per worktree, with the working directory set to the worktree. Core owns the PTYs, so they keep running when the user switches worktrees or the plugin host restarts.
- The panel renders with xterm.js and its WebGL addon; core runs the PTYs with node-pty. Both sit behind one terminal interface, so the emulator can change later. Ghostty's libghostty-vt was evaluated and deferred until a maintained browser renderer exists on its 1.x ABI (`docs/decisions/0017-terminal-xterm-first.md`).
- Core keeps a headless mirror of each terminal with the same engine, so a reloaded renderer or a second window re-attaches to the current screen and scrollback.
- Terminal colors come from the active theme's palette.
