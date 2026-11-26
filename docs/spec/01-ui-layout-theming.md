<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Layout, panels and keyboard model

Lands in: M1. The vim layer: Later.

This file says what the shell does. How it looks (colours, borders, focus styling) is in `docs/design/ui.md` and `docs/design/tokens.json`.

The window is a fixed shell around a user-arrangeable grid: a full-height left menu, a right rail, and between them a header, a grid of panels and a footer. The header and footer belong to the selected project and worktree, so they span only the middle, not the left menu.

**Shell**

- **Left menu:** the project list, hidden and shown again with Ctrl B. Its top row, as tall as the header, holds a button that hides the menu and the name "yaa" in the wordmark's Geist (`docs/design/ui.md`). While the menu is hidden, the button that shows it again leads the header. Each project expands to its default branch and its worktrees, each with a state badge (see `02-worktrees.md`). A project overview entry sits at the top of each project.
- **Header:** shows the current project and worktree, with slots on the left, centre and right that plugins can fill.
- **Footer:** slots for plugins, plus core info for the selected project: branch, uncommitted change count, ahead/behind. Plugins add chips for agent state, cost and PR status.
- **Centre grid:** every panel is a view contributed by core or a plugin (id, title, icon, component). Users drag panels to rearrange, split, tab and resize them. A layout is saved per project, with a default layout for new projects and a reset action. A saved layout that no longer reads as one (from an older dock version, for example) gives way to the default. A panel whose kind nothing provides any more, such as one from a removed plugin, keeps its place and says so.

**Right rail and panels**

- **Right rail:** one icon per panel kind (files, changes, chat, terminal, review, usage, workflows) that toggles the panel, with the active ones marked and a tooltip with the shortcut. Plugins add their own icons.
- **Panel header:** a small header with an icon, a title, a menu and a close button, so every panel can be closed with the mouse. Panels with a single purpose, such as the editor, show tabs instead of a title.
- **Closing by keyboard:** Ctrl W closes the focused tab, and the panel when it has none, while focus is in the grid. In a focused terminal Ctrl W goes to the shell, where it deletes a word (see Keyboard model).
- **Focus:** exactly one panel is focused and is styled as `docs/design/ui.md` describes. The footer shows the input mode, for example NORMAL when the vim layer is on. Focus moves with directional keys.
- **Focus regions:** keyboard focus moves between the panels of the grid and the shell's regions: left menu, header, footer and right rail. A region with focus shows the same accent line as a focused panel, and the grid's line gives way while it does. Inside the rail and the menu, J and K move between items; inside the header and footer, H and L. The focused item is marked, and coming back to a region lands on the item that had focus last.
- **Default keys:** Ctrl H, J, K and L focus the panel to the left, below, above and to the right; past the edge of the grid they go on to the left menu (skipped while hidden), the footer, the header and the rail. Shift H or K and Shift L or J go to the previous and next tab of the focused panel, wrapping around; they work in the grid only, and not while a text field has focus, where they type capitals. Ctrl Shift H and L make the focused panel narrower and wider, Ctrl Shift K and J shorter and taller, by 5% of the grid. Closing a panel that is not focused leaves focus where it was.
- **Icons over text:** settings, plugins, close, add, search and similar controls are icon buttons with a tooltip that shows the shortcut. Text labels are for content, not for chrome.

**Command palette**

- One keystroke opens it, Ctrl Shift P by default. It lists every registered command that has a title and whose `when` condition holds where the palette was opened (project, worktree, focused panel), each with its first key and its category. Typing filters the list: the typed characters must appear in order in the category and title, case and spaces ignored, and a run of characters or a match at the start of a word ranks higher. The arrow keys, Ctrl J and K, and Ctrl N and P move the selection, Enter runs the selected command after the palette closes and focus has returned, Escape or a click outside closes it. These keys are commands too, bound with `when: palette.open`.
- Plugins register commands, and may register a settings page that the palette's settings entry lists next to core settings. Plugin settings are rendered from a schema by default, or from a custom panel.

**Keyboard model**

- Every action is a command with an id. Keybindings map keys to command ids, and users can override them. Components never attach their own key listeners; Monaco and the terminal are the two exceptions below.
- **Focus contexts:** each keybinding has an optional `when` condition over context keys such as `panel.kind == terminal`, `editor.focus` or `vim.mode == normal`, like VS Code's `when` clauses. A condition is keys combined with `!`, `&&`, `||` and parentheses (`&&` binds tighter), and `key == value` or `key != value` with a bare or single-quoted value; a key on its own holds when its value is true or a non-empty string. A command can have a `when` too: it runs, and the palette lists it, only while that holds. A key resolves to the first binding whose condition holds and whose command is registered and can run, so a binding to a command no plugin provides does not take the key. Core context keys: `panel.kind` (the active panel's kind), `focus.region` (`menu`, `header`, `dock`, `footer` or `rail`; `dock` when nothing has focus), `focus.list` (`vertical` or `horizontal` in a shell region), `inputFocus` (a text field has focus) and `palette.open`. Plugins add context keys under their namespace.
- **Passthrough:** Monaco and the terminal receive keys first. Each declares the keys it gives up to the app, for example the palette key and panel-focus keys. Every other key, Ctrl W and Ctrl C in a terminal included, stays with the widget. The list is a setting, so a user can take a key back.
- Electron's default application menu is replaced, so its accelerators do not take app keys.
- Focus moves between panels with directional keys, and within a panel by the panel's own navigation (lists, trees and tabs share one navigation helper).
- An optional vim layer adds modal navigation in lists and trees. In the editor, vim keys come from a Monaco vim-mode extension, which needs a quick check against the Monaco version used.
- Anything reachable with the mouse is reachable with the keyboard; this is a release criterion for each panel.

## Theming

Lands in: M1 for tokens and the dark theme; M6 for the light theme, the OS setting and user themes; VS Code theme import: Later.

One theme restyles the whole app: shell, panels, Monaco, code blocks in chat, diffs and the terminal.

- **Tokens:** all styling reads semantic CSS variables generated from `docs/design/tokens.json`: surfaces, text, borders, accent, focus, the worktree state colors (idle, running, attention, error, done), diff added, removed and changed, plus radius, spacing, sizes, font family and sizes, and density. Tailwind's theme maps to these variables, so components use semantic utilities such as `bg-surface` and never raw palette colors.
- **How tokens reach the app:** `pnpm run tokens` writes `packages/ui/theme.css`, a Tailwind `@theme static` block, and `packages/ui/tokens.ts`, the `TokenName` type; `check:tokens` fails when they are out of date. Each group lands in the Tailwind namespace that makes its utilities: colors in `--color-*` (`bg-surface`, `text-text-soft`, `bg-state-running`), font sizes in `--text-*`, line heights in `--leading-*`, radii in `--radius-*`, and both space and size in `--spacing-*` (`p-2`, `p-0.5`, `h-row`); camelCase keys become kebab-case and a dot becomes `_`. Every variable is emitted, so plugin styles can read any token with `var()`. Tailwind's default theme is not loaded, so palette colors and off-scale sizes have no utilities. Density is left out until a second density ships.
- **Theme file:** a `theme.json` declares a name, a kind (light or dark), token values, a Monaco theme, a Shiki theme and a 16-color terminal palette. Missing tokens fall back to the built-in base theme, so a theme can be a short list of overrides.
- **Built-ins:** one dark and one light theme, with a setting to follow the operating system.
- **Loading:** themes live in a user themes folder, optionally per project, and are applied at runtime by setting the variables on the root element, with no restart. Plugins can contribute themes through a `themes` contribution point.
- **Rule for plugins:** plugin UI uses tokens only. The design system exports the token names as types, so a misspelled token fails the typecheck.
- **Later:** VS Code color themes as an import source. Shiki reads that format; Monaco needs a conversion step, to be checked.
