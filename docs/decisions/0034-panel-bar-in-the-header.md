# 0034 Panel bar in the header

Status: decided, 2026-11-26. Supersedes the rail in `docs/decisions/0026-lighter-grid.md`.

Context: the right rail, a card on the grid with one toggle per panel kind, took a column of the window's width for nine 32px buttons and left the rest of that column empty.

Decision: the toggles move to the end of the header as a row of the header's 26px icon buttons, the panel bar. The grid takes the window's width right of the menu. The header is one focus region with the bar in it, moved through with H and L; the `rail` region, its colour token and the 32px button size are gone. Pointing at or focusing an open panel's toggle marks that panel with an accent edge, and a panel the bar opens flashes once, so the bar shows where its panels are.

Revised 2026-11-27: named chips for open panels, and an accent bar under the focused panel's toggle, were tried and dropped. Chips moved the bar's icons around as panels opened and closed; the bar is on/off toggles only.

Consequences: the header's right end belongs to the bar; plugin slots on the right of the header sit before it. Ctrl L from the rightmost panel stays in the grid.
