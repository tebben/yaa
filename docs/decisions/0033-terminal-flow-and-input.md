# 0033 The terminal: flow control, restore, input and fonts

Status: decided, 2026-11-26.

Context: M3 step 3 builds the terminal on xterm.js and node-pty (`0017-terminal-xterm-first.md`), which left node-pty in the core process, output flow control, IME, the Kitty keyboard protocol and CJK and emoji fallback unverified.

Decision:
- **node-pty runs in the core's `utilityProcess`.** It is external to the core bundle and a dependency of the desktop app, so it loads from `node_modules`. It compiles on install with the python3, make and C++ compiler of GitHub's Ubuntu runners, so CI installs nothing more.
- **Flow control** counts characters. Core pauses a PTY once the mirror or the slowest view is more than 256 Ki characters behind, and resumes it when all are within 32 Ki; a view reports every 32 Ki it has taken in, and goes with its connection. Rejected: dropping a slow view's output and sending a new snapshot, which loses scrollback and flickers.
- **Background throttling is off** for the window: xterm.js takes output in on timers, which a hidden page runs about once a second, pausing programs.
- **A terminal is a UI-only plugin** over a panel API in front of core. Rejected: a backend module relaying output, which adds a process to every byte and ties terminals to the plugin host's life.
- **Snapshots** are `@xterm/addon-serialize` output plus the modes it leaves out: SGR and pixel mouse reports and a hidden cursor. The scroll region is not restored; full-screen programs set it again when they redraw.
- **IME** works with xterm.js as it is: composed text shows at the cursor, restyled from the tokens, and reaches the program once. Checked by driving composition over the DevTools protocol, not with a real input method.
- **Kitty keyboard protocol:** not supported, since xterm.js 6.0.0 has none. Revisit with an xterm.js release that does.
- **Widths** are Unicode 11 (`@xterm/addon-unicode11`) in panel and mirror, so a joined emoji shows as its parts. Rejected: `@xterm/addon-unicode-graphemes`, which is experimental.
- **Fallback fonts** are the system's. Emoji drew in the check; the machine had no CJK font, so CJK showed as two-column boxes, with no glyphs verified. Nerd Font icons in prompts show as boxes even where a Nerd Font is installed, until the theme's mono font names one.

Consequences: M3 step 4 runs setup and sign-in commands in these terminals, which needs a terminal that runs a command and stays once it ends.
