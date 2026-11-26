# 0017 Terminal: xterm.js first, libghostty-vt later

Status: decided, 2026-11-26. M0 spike, branch `spike/terminal` (code and measurements in `spikes/terminal/`, kept for reference, not merged).

Context: `docs/spec/07-editor-files-terminal.md` named Ghostty's libghostty-vt as the target and xterm.js with node-pty as the fallback, pending a spike on its stability, Node binding and speed inside Electron.

What the spike found (Electron 45.5.0, x64 Linux on Wayland):
- libghostty-vt reached 1.0 on 2026-11-06 (`vt-1.0.2` on 2026-11-24) with a stable C ABI and signed wasm builds (0.8 MB small, 1.2 MB fast). The wasm runs unchanged in Node and in the renderer, so no native module or Zig build is needed. Headless it parses 4-20x faster than `@xterm/headless` 6.0.0 (134-780 MiB/s against 36-42), with the same final screen.
- It has no renderer, input handling, selection or IME: the app would draw everything itself. With only data extraction and no drawing, it already reaches 2-4x xterm's throughput in the renderer.
- No browser terminal is built on the 1.0 ABI yet. ghostty-web 0.4.0 uses a patched pre-1.0 core and crashed the Electron renderer (exit 139) on a Unicode workload, with open upstream issues on grapheme memory corruption. It and wterm 0.6.0 freeze the UI in 100-140 ms frames during output floods, and both skip SGR styles that xterm draws. `@gkoreli/ghostty-vt-js` is a one-maintainer project on a pre-1.0 build.
- xterm.js 6.0.0 with the WebGL addon handles 45-50 MiB/s at 40-60 fps, far above what agents and build tools print, and drew every style, emoji, link and TUI in the test correctly. node-pty 1.1.0, rebuilt for Electron with `@electron/rebuild`, loaded and ran in the main process.

Decision: the terminal panel uses xterm.js 6 with `@xterm/addon-webgl`, and core uses node-pty, behind the terminal interface in the spec. libghostty-vt is not used in v1. Revisit when a maintained browser renderer on the libghostty-vt 1.x ABI exists, or when xterm.js measurably limits us; the interface keeps the swap to the emulator and panel.

Consequences:
- M3 builds the terminal on xterm.js. Core keeps a headless mirror per terminal (`@xterm/headless` with `@xterm/addon-serialize`), so a reloaded renderer or second window re-attaches to the current screen: the spike serialized a screen with 1,000 lines of scrollback in 16 ms and restored it in 8 ms. Mirror and panel are the same engine, so they cannot disagree.
- Still unverified, for M3: node-pty in the core process (depends on the transport spike), output flow control between PTY and panel, IME and the Kitty keyboard protocol, and CJK and emoji fallback next to the bundled Geist Mono.
