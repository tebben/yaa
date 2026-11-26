<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Layout, panels and keyboard model

The window is a fixed shell around a user-arrangeable grid: a full-height left menu, a right rail, and between them a header, a grid of panels and a footer. The header and footer belong to the selected project and worktree, so they span only the middle, not the left menu.

**Shell**

- **Left menu:** the project list. Each project expands to its default branch and its worktrees, each with a state badge (see Projects and worktrees). A project overview entry sits at the top of each project.
- **Header:** shows the current project and worktree, with slots on the left, centre and right that plugins can fill.
- **Footer:** slots for plugins, plus core info for the selected project: branch, uncommitted change count, ahead/behind. Plugins add chips for agent state, cost and PR status.
- **Centre grid:** every panel is a view contributed by core or a plugin (id, title, icon, component). Users drag panels to rearrange, split, tab and resize them. A layout is saved per project, with a default layout for new projects and a reset action.

**Right rail and panels**

- **Right rail:** one icon per panel kind (files, changes, chat, terminal, review, usage, workflows) that toggles the panel, with the active ones marked and a tooltip with the shortcut. Plugins add their own icons.
- **Panel header:** a small header with an icon, a title, a menu and a close button, so every panel can be closed with the mouse. Panels with a single purpose, such as the editor, show tabs instead of a title.
- **Closing by keyboard:** Ctrl W closes the focused tab, and the panel when it has none.
- **Focus:** exactly one panel is focused. It has an accent border and a soft ring, the others stay neutral, and the footer shows the input mode (for example NORMAL when the vim layer is on). Focus moves with directional keys.
- **Icons over text:** settings, plugins, close, add, search and similar controls are icon buttons with a tooltip that shows the shortcut. Text labels are for content, not for chrome.
- **Look:** panels are rounded cards on a slightly darker ground, with low-contrast borders and desaturated state colors. One accent color, used sparingly.

**Command palette**

- One keystroke opens it. It lists every registered command, filtered by context (project, worktree, focused panel).
- Plugins register commands, and may register a settings page that the palette's settings entry lists next to core settings. Plugin settings are rendered from a schema by default, or from a custom panel.

**Keyboard model**

- Every action is a command with an id. Keybindings map keys to command ids, and users can override them. Components never attach their own key listeners.
- Focus moves between panels with directional keys, and within a panel by the panel's own navigation (lists, trees and tabs share one navigation helper).
- An optional vim layer adds modal navigation in lists and trees. In the editor, vim keys come from a Monaco vim-mode extension, which needs a quick check against the Monaco version used.
- Anything reachable with the mouse is reachable with the keyboard; this is a release criterion for each panel.

## Theming

One theme restyles the whole app: shell, panels, Monaco, code blocks in chat, diffs and the terminal.

- **Tokens:** all styling reads semantic CSS variables: surfaces (background, surface, raised surface), text, borders, accent, focus ring, the worktree state colors (running, attention, error, done), diff added, removed and changed, plus radius, spacing, font family and sizes, and density. Tailwind's theme maps to these variables, so components use semantic utilities such as `bg-surface` and never raw palette colors.
- **Theme file:** a `theme.json` declares a name, a kind (light or dark), token values, a Monaco theme, a Shiki theme and a 16-color terminal palette. Missing tokens fall back to the built-in base theme, so a theme can be a short list of overrides.
- **Built-ins:** one dark and one light theme, with a setting to follow the operating system.
- **Loading:** themes live in a user themes folder, optionally per project, and are applied at runtime by setting the variables on the root element, with no restart. Plugins can contribute themes through a `themes` contribution point.
- **Rule for plugins:** plugin UI uses tokens only. The design system exports the token names as types, so a misspelled token fails the typecheck.
- **Later:** VS Code color themes as an import source. Shiki reads that format; Monaco needs a conversion step, to be checked.
