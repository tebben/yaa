# 0026 Lighter grid

Status: decided, 2026-11-26. The rail is superseded by `docs/decisions/0034-panel-bar-in-the-header.md`.

Context: with the grid as dark as the frame (`docs/decisions/0025-own-dark-theme.md`), the workspace did not read as the content area of the window; the header, menu, footer and the gaps between panels looked like one dark frame.

Decision: the grid, the workspace between the menu and the rail, is lighter than the frame. Panels and the rail are darker cards on it, each panel with a header strip in the left menu's colour, darker than its content.

Consequences: surfaces no longer step from dark to light outward from the frame; `docs/design/ui.md` gives the order. Themes set `grid` apart from `chrome`.
