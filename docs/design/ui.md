# UI design language

Authority: this file and `tokens.json` win over the mockups. Mockups are a guide.

## Principles
- **Chill**: clean, quiet, nothing competing for focus. Sleek with a little style, not in your face.
- **Layers, not outlines**: parts of the window differ by surface colour (see Surfaces). Hairlines only where two areas of the same surface meet, such as under a panel header.
- **Panels**: separated by narrow gaps on the lighter grid, the workspace they sit in. Panels have rounded corners and no heavy padding.
- **No AI-slop tells**: no coloured left borders on items or buttons, no decorative gradients or glow. Selection is a quiet tint.
- **Icons over text** for actions (settings, close, add, more). Text only where an icon would be ambiguous. Icon set: `@lucide/svelte`. File icons, in the files tree and the editor's tabs, come from the Catppuccin set (`@iconify-json/catppuccin`) by name and extension through `FileIcon` in `packages/ui`; the set loads as its own chunk when the first file icon draws, and a file it has no icon for gets lucide's file icon.
- **Font**: Geist Sans and Geist Mono (OFL). Panel titles are medium (500), the wordmark semibold (600). No light or thin weights: at 13 to 16px on a dark surface they lose contrast.
- **Dark theme**: yaa's own (`docs/decisions/0025-own-dark-theme.md`): cool neutral surfaces and text, and a periwinkle accent that is none of the state colours.
- **Keyboard first**: everything reachable by keys; the command palette is opened by key, there is no search bar in the header.
- **Cursor**: anything that acts on a click shows the pointer; sashes show the resize cursor.

## Surfaces
Each part of the window has its own colour token, so a theme can tune it alone. The frame (header, footer and menu) is darkest. The grid, the workspace right of the menu, is lighter, so it reads as the content area; the panels are darker cards on it, each panel with a header strip in the menu's colour (`docs/decisions/0026-lighter-grid.md`). Overlays and controls are lightest.

| Part | Token |
| --- | --- |
| Header and footer | `chrome` |
| Left menu, and the panel header strip in the same colour | `menu`, `panelHeader` |
| Panel content, the cards on the grid | `surface` |
| Panel header on hover | `panelHeaderHover` |
| The workspace behind the panels | `grid` |
| Inputs, buttons and key caps | `raised` |
| Palette and tooltips | `overlay`, with the `overlay` shadow and radius |
| Hover, pressed toggle and selected item | `hover`, `pressed`, `selection` |

Code is highlighted with the `syntax` colours: `keyword`, `string`, `number`, `comment` and `type`. The terminal draws on `surface` in `text`, with the 16 `terminal` colours as its palette, an `accent` cursor and a `selection` selection.

Lines: `border` for hairlines, `borderStrong` for inputs, key caps, overlays and the scrollbar. Text: `text` (primary), `textSoft` (secondary), `textMuted`. Accent: `accent` and `accentSoft`; `focus` for the focus edge.

## Spacing
- One inset, 12px (`space.3`), from the edge of every area to its content: header, menu items, panel header icon and panel content line up on it.
- 8px between an icon and its text (6px in the header, where the icon is a button with its own padding).
- Heights are on a 4px grid: header 40px, panel header 36px, footer 28px, buttons 26px.

## Layout
- The header spans the window. It leads with the button that hides and shows the left menu and the name "yaa"; these keep their place whether the menu is open or not. While the menu is open they take its width, so the project starts in line with the leftmost panel's content. The path after them stays a step below the name: `md`, the parent steps `textMuted` and normal weight, the open step `textSoft` and medium, 14px icons in the text's colour, and the slashes in `borderStrong`. The header is bound to the **selected project**.
- The left menu and the grid sit between the header and the footer, which also spans the window.
- The panel bar ends the header, its last icon as far from the window's edge as the menu button's is at the start. One icon button per panel kind: open panels have a bright icon on the quiet `pressed` tint, closed panels a muted icon with no background, and nothing else marks them. Hover and keyboard focus add the hover tint. Pointing at or focusing an open panel's icon draws an `accent` edge over a faint accent tint on that panel, above the focus edge; a panel the bar opens flashes the same once and fades.
- Panel header: icon, medium title, menu, full screen, close (x), on a strip in the left menu's colour, darker than the content, with a hairline under it and lighter while hovered. The menu, full screen and close show while the header is hovered. Tabs never wrap (`nowrap`, truncate with ellipsis). The header's actions, full screen (lucide's maximize, minimize while full screen) and close, are `TabButton`s in `packages/ui`.
- Panels sharing a group show a strip of tabs like the editor's file tabs: icon and medium title, a hairline after each tab, the shown tab on the `surface` colour so it runs into the content, the others muted and `textSoft` under the pointer. A tab's close (`TabClose` in `packages/ui`, shared with the editor) shows on the shown tab and under the pointer.
- A full-screen panel is shown like a dialog: it lifts out of the grid to `modalInset` from the window's edges, with the overlay's radius, border and shadow, over the window dimmed as behind the palette. Its full-screen and close buttons stay in sight.
- Closing: small x button; Ctrl+W closes the tab, then the panel. No hint text about it.
- The editor's header is its file tabs: file icon, name in Geist Mono, italic while a preview, and a dot for unsaved text that turns into the close button under the pointer.
- The terminal's header is its tabs: terminal icon, the running program in Geist Mono with the folder after it when that is not the worktree's, and a button for a new terminal after the last tab.
- **Focus must be obvious**: the focused panel has a brighter title. After a key moves focus, it also shows the focus edge, a border in the `focus` colour; a click or Escape hides the edge until a key moves focus again. Keys act on the focused panel. The edge's widths are the `focusTop` and `focusSide` tokens: 1px all round by default, or a line on top only with `focusSide` at 0. A setting to choose between the two lands with the settings page (proposed).
- Shortcuts are shown as key caps, one per key (`Kbd` in `packages/ui`), in tooltips and the palette.
- Scrollbars are thin everywhere, in the `borderStrong` colour on a transparent track.

## Command palette
An overlay with rounded corners and a shadow. The query and the rows share one text edge; the selected row is a rounded `selection` tint. Each row shows the command's first key as key caps and its category.

## Project tree
Drawn as a **branch graph**: the project's trunk runs down from under its chevron and ends at the last worktree, and a tick leads from it to each worktree's node, which sits under the project's folder icon. A node has its state's colour. The main checkout's node is filled, as is a done worktree's; any other is an open ring. A worktree being created or finished pulses. Branch names are Geist Mono at `sm`, in `textSoft`, `text` when selected, and line up with the project name. Selection = tint `selection` across the full row, no side border. The footer shows the open worktree's state at its right, as a dot and its name in the state colour. Projects are 8px apart; hover actions (new worktree, remove, finish) are small icon buttons at the row's right edge that replace its detail while hovered.

## Composer (chat input)
- Context chips (files, issues), `@` autocomplete, `/` for commands and skills.
- Queued messages with a Steer action. Hints: Enter queues, Ctrl+Enter steers, Esc stops.
- Edited-files bar with a Review action.
- Chips for mode, model and thinking effort; context meter ring; send turns into stop while running.
- Drafts survive switching worktrees.

## State colours
Idle (muted), Running (blue), Needs attention (amber), Error (red), Done (green). State is derived from events, never stored by hand.

## Brand
The mark is a lowercase **y** drawn as a git merge: a small filled node (main) and a larger open ring (a worktree), each on a branch line, joining at a point from which the stem bends down to the left. The ring's line starts on the ring instead of under it, so the ring stays open. Source: `docs/design/brand/mark.svg`. Wordmark "yaa" in Geist 600. Pronounced "ja". Name meaning: yet another ADE, but this one is mine.
