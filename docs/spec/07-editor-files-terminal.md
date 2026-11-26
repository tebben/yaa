<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Editor, files and terminal

Lands in: M3.

**Editor**

- Monaco with tabs per worktree: a reusable preview tab, pinned tabs, a dirty marker, keys for next and previous tab, close and reopen, and quick-open by fuzzy path. Diffs open as tabs too.
- Plugins can add decorations, gutter actions and widgets, and commands scoped to the editor.
- Vim keys are optional (see `01-ui-layout-theming.md`).

**Files panel**

- A tree of the active worktree, folders first, navigable with arrow or vim keys: Down or J and Up or K move, Right or L expands a folder and then steps into it, Left or H collapses it or steps out, and Enter opens: a folder expands or collapses, a file opens in the editor.
- A filter box narrows the tree to the files whose path matches, with the palette's matching, as a flat list of at most 100, best first. F focuses it, Enter or Down moves to the matches, Escape clears it.
- The file list comes from `git ls-files` plus untracked files and is kept fresh by a file watcher (`docs/decisions/0029-worktree-plugin-api.md`), so large repositories list quickly and ignored files stay hidden unless toggled on with `.`. An ignored folder, a submodule and a repository inside the worktree are read when expanded, and the filter finds only the files read so far.
- Files carry git status decorations: M modified, A added, R renamed, U untracked, ! conflicted, and a dot on a folder with changes in it. Deleted files are not listed.
- New file (N), rename (R or F2) and delete (D or Delete) are in the panel's toolbar and the palette. New file and rename ask for the path in the worktree, so a rename can move; folders the path needs are made. Delete asks for confirmation and removes a folder with everything in it. Nothing is written over, and a path that leaves the worktree or touches `.git` is refused.

**Terminal**

- Terminals open from the palette or a key, one or more per worktree, with the working directory set to the worktree. Core owns the PTYs, so they keep running when the user switches worktrees or the plugin host restarts.
- The panel renders with xterm.js and its WebGL addon; core runs the PTYs with node-pty. Both sit behind one terminal interface, so the emulator can change later. Ghostty's libghostty-vt was evaluated and deferred until a maintained browser renderer exists on its 1.x ABI (`docs/decisions/0017-terminal-xterm-first.md`).
- Core keeps a headless mirror of each terminal with the same engine, so a reloaded renderer or a second window re-attaches to the current screen and scrollback.
- Terminal colors come from the active theme's palette.
