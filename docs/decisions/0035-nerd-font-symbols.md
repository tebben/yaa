# 0035 Nerd Font icons: the symbols-only font, bundled

Status: decided, 2026-11-26. Supersedes the line on Nerd Font icons in `0033-terminal-flow-and-input.md`.

Context: shell prompts and terminal programs print Nerd Font icons from the private use areas. Geist Mono has none, and Chromium does not pick an installed Nerd Font for them, so they showed as boxes.

Decision: bundle Symbols Nerd Font Mono from the Nerd Fonts release v3.5.1 (1.2 MB as woff2, in `packages/ui`) and name it after Geist Mono in the mono font token, so the terminal, the editor and mono text all draw the icons with nothing installed. It is the Mono variant, whose icons all have one advance and take one column; that advance is wider than Geist Mono's, so in the terminal an icon draws into the space that prompts put after it, and covers a character that follows directly. xterm.js leaves Nerd Font icons unscaled; shrinking them to a cell with `size-adjust` would make them hard to read. Its `unicode-range` leaves out the two emoji and dingbat code points Nerd Fonts also fills, so those keep the system's look. No npm package of the release exists, so the font file is in the repository with its licence and the list of icon sets.

Rejected: naming installed Nerd Fonts in the token, which works only where the user has one under a name we guess; a font setting, which still shows boxes until set; a patched Geist Mono, which we would have to rebuild with every release of either.

Consequences: an update replaces the woff2 and `ICON-SETS.md`. M6's licence notices include the icon sets, several of which ask for attribution.
