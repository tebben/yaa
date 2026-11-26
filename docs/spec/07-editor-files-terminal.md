<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Editor, files and terminal

Lands in: M3.

**Editor**

- Monaco, themed from the tokens, with highlighting for its languages and language services for JSON only (`docs/decisions/0030-editor-monaco.md`). Text only: a file that is not UTF-8, or over 10 MB, is not opened.
- Tabs per worktree, in the panel's header: a reusable preview tab, in italics, and tabs that stay. A tab stays once its file is edited, on a double click, or by the Keep editor tab open command. Unsaved text shows as a dot on the tab.
- Keys: Ctrl S saves; Ctrl Tab or Ctrl PageDown and Ctrl Shift Tab or Ctrl PageUp go to the next and previous tab; Ctrl W closes the tab, and the panel once no tab is open; Ctrl Shift T reopens the last closed tab; Ctrl P goes to a file by fuzzy path, opening the editor if needed. Closing a tab with unsaved text asks to save, discard or cancel.
- Saving writes only over the version the text was made from. A file that changes on disk reloads when nothing is unsaved; otherwise the editor offers to overwrite it or discard the unsaved text. A deleted file can be saved again.
- Tabs and unsaved text are kept in plugin storage, so both come back after the panel closes or the app restarts.
- Files open from the files panel and, from the chat's rendering in M2, from file paths in chat, at the line given. A click previews and leaves focus where it is; Enter and a double click move into the editor, and a double click keeps the tab.
- Diffs open as tabs too.
- Plugins can add decorations, gutter actions and widgets, and commands scoped to the editor.
- Vim keys are on, from monaco-vim (`docs/decisions/0031-editor-vim-keys.md`): a status line under the text shows the mode and takes what is typed after / and :, and :w saves. The app's keys come first, so those it binds, such as Ctrl B, H, J, K, L, P, S and W, do not reach vim. Switching vim keys off comes with plugin settings (see `11-platform-services.md`).

**Files panel**

- A tree of the active worktree, folders first, navigable with arrow or vim keys: Down or J and Up or K move, Right or L expands a folder and then steps into it, Left or H collapses it or steps out, and Enter opens: a folder expands or collapses, a file opens in the editor (see Editor above).
- A filter box narrows the tree to the files whose path matches, with the palette's matching, as a flat list of at most 100, best first. F or / focuses it, Enter or Down moves to the matches, Escape clears it.
- The file list comes from `git ls-files` plus untracked files and is kept fresh by a file watcher (`docs/decisions/0029-worktree-plugin-api.md`), so large repositories list quickly and ignored files stay hidden unless toggled on with `.`. An ignored folder, a submodule and a repository inside the worktree are read when expanded, and the filter finds only the files read so far.
- Files carry git status decorations: M modified, A added, R renamed, U untracked, ! conflicted, and a dot on a folder with changes in it. Deleted files are not listed.
- New file (N), rename (R or F2) and delete (D or Delete) are in the panel's toolbar and the palette. New file and rename ask for the path in the worktree, so a rename can move; folders the path needs are made. Delete asks for confirmation and removes a folder with everything in it. Nothing is written over, and a path that leaves the worktree or touches `.git` is refused.

**Terminal**

- Terminals open from the palette or a key, one or more per worktree, with the working directory set to the worktree. Core owns the PTYs, so they keep running when the user switches worktrees or the plugin host restarts.
- The panel renders with xterm.js and its WebGL addon; core runs the PTYs with node-pty. Both sit behind one terminal interface, so the emulator can change later. Ghostty's libghostty-vt was evaluated and deferred until a maintained browser renderer exists on its 1.x ABI (`docs/decisions/0017-terminal-xterm-first.md`).
- Core keeps a headless mirror of each terminal with the same engine, so a reloaded renderer or a second window re-attaches to the current screen and scrollback.
- Terminal colors come from the active theme's palette.
