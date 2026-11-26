<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Editor, files and terminal

**Editor**

- Monaco with tabs per worktree: a reusable preview tab, pinned tabs, a dirty marker, keys for next and previous tab, close and reopen, and quick-open by fuzzy path. Diffs open as tabs too.
- Plugins can add decorations, gutter actions and widgets, and commands scoped to the editor.
- Vim keys are optional (see Layout, panels and keyboard model).

**Files panel**

- A tree of the active worktree, navigable with arrow or vim keys, with expand and collapse, and open on Enter.
- A filter box narrows the tree by fuzzy path match, and a key focuses it.
- The file list comes from `git ls-files` plus untracked files and is kept fresh by a file watcher, so large repositories list quickly and ignored files stay hidden unless toggled on. Files carry git status decorations.
- Basic operations: new file, rename and delete, with confirmation.

**Terminal**

- Terminals open from the palette or a key, one or more per worktree, with the working directory set to the worktree. They keep running when the user switches worktrees.
- The target is Ghostty's terminal core through libghostty-vt, its embeddable library for terminal state and escape-sequence parsing, with the app drawing the terminal itself. The library's API stability, its Node bindings or web build, and rendering performance inside Electron are unverified, so milestone 0 includes a spike. Fallback: xterm.js with node-pty, behind the same terminal interface, so the choice can change later.
- Terminal colors come from the active theme's palette.
