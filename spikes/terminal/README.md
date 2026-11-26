# Spike: terminal emulator (libghostty-vt vs xterm.js)

Throwaway code for the M0 terminal spike. Decision: `docs/decisions/0016-terminal-xterm-first.md` on `main`.

Machine: x64 Arch Linux, Hyprland (Wayland), Node 24.9.0, Electron 45.5.0, run on 2026-11-26.

## Run

```sh
pnpm install                          # node-pty, electron and esbuild run build scripts (allowBuilds)
npx electron-rebuild -v 45.5.0 -o node-pty
node gen-corpus.mjs && node gen-showcase.mjs
node bench-headless.mjs <xterm|ghostty-vt-js|ghostty-1.0.2|ghostty-1.0.2-small>
node verify.mjs                       # ghostty 1.0.2 and xterm end on the same screen
node reattach.mjs                     # headless mirror -> serialize -> restore
npx esbuild src/renderer.mjs --bundle --format=esm --target=chrome140 --outfile=dist/renderer.js
npx electron . bench [engines] [corpora]
npx electron . shot [engines]         # screenshots in shots/
npx electron . live <engine>          # a real login shell
```

`vendor/` holds the signed libghostty-vt 1.0.2 wasm from `release.files.ghostty.org` (checksums in `SHA256SUMS`). `ghostty-raw.mjs` is a 50-line binding to its C ABI.

## Candidates

| Engine | Version | Ghostty core | Renderer |
| --- | --- | --- | --- |
| xterm.js + `@xterm/addon-webgl` | 6.0.0 / 0.19.0 | none, own TS parser | WebGL2 (also DOM) |
| ghostty-web (Coder) | 0.4.0 | pre-1.0 Ghostty with Coder's own wasm API patch | Canvas 2D |
| wterm + `@wterm/ghostty` (Vercel Labs) | 0.6.0 | Ghostty v1.3.1, pre-1.0 | DOM or WebGL |
| `@gkoreli/ghostty-vt-js` | 0.7.1 | pre-1.0 wasm (helpers removed in 1.0) | WebGL2 |
| libghostty-vt official wasm | vt-1.0.2 | yes, stable C ABI | none: we would write it |

## Headless parse throughput (Node, 160x48, 10,000 lines scrollback, 64 KiB writes, median of 3)

MiB/s. 16 MiB per workload, mixed is 20 MiB.

| Engine | plain | sgr | truecolor | unicode | tui | mixed |
| --- | --- | --- | --- | --- | --- | --- |
| @xterm/headless 6.0.0 | 39 | 36 | 42 | 37 | 42 | 39 |
| ghostty-vt-js 0.7.1 (wrapper) | 71 | 65 | 88 | 52 | 71 | 59 |
| libghostty-vt 1.0.2 ReleaseFast | 780 | 157 | 209 | 207 | 357 | 205 |
| libghostty-vt 1.0.2 ReleaseSmall | 760 | 134 | 202 | 188 | 312 | 189 |

`verify.mjs`: after each workload, the last 40 screen lines of ghostty 1.0.2 and xterm are identical (tui differs only in trailing-space trimming). Gotcha: libghostty-vt's scrollback defaults to 10,000 *bytes* (one page); set `SCROLLBACK_MAX_BYTES` as well as `SCROLLBACK_MAX_LINES`.

## In Electron (PTY in main, IPC to renderer, `cat` of the workload, 160x48)

MiB/s until the last byte is parsed and painted; p95 and max frame interval during the flood.

| Engine | plain | sgr | truecolor | unicode | tui | mixed | frames p95 / max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| null (PTY + IPC ceiling) | 175 | 192 | 284 | 241 | 267 | 240 | 8-12 ms |
| xterm-webgl | 48-51 | 46-47 | 46-48 | 50 | 81-97 | 45-47 | 17-25 ms, one 58-67 ms frame on truecolor |
| xterm-dom | 48 | 46 | 33 | 32 | 99 | 38 | 17-50 ms |
| ghostty-web | 53 | 43 | 31 | **renderer crash** | 49 | 39 | 117-133 ms |
| wterm-dom | 61 | 42 | 39 | 31 | 49 | 42 | 100-142 ms |
| wterm-webgl | 60 | 45 | 63 | 43 | 50 | 46 | 100-108 ms |
| ghostty-vt-js | 46 | 42 | 68 | 38 | 44 | 41 | 17-25 ms, but it sized itself 44x84, not comparable |
| libghostty-vt 1.0.2, parse + per-frame cell walk, **no drawing**, 8 ms time slices | 171 | 82 | 116 | 109 | 212 | 109 | 8-17 ms |

- ghostty-web 0.4.0 crashes the Electron renderer (`render-process-gone`, exit 139) on the unicode workload, every time. Open upstream issues #141 (wasm memory corruption with multi-codepoint graphemes) and #215 (trap on a grapheme cluster) are the likely cause.
- ghostty-web and wterm parse each write synchronously, so a flood freezes the UI for 100+ ms frames. xterm time-slices its write queue and stays near 40-60 fps.
- The last row is the floor for a renderer of our own on libghostty-vt: 2-4x xterm's throughput before a single glyph is drawn.
- xterm logged one "Parsing error" on `mixed`: the corpus is spliced from four workloads at byte offsets that cut sequences. A corpus artifact, not an xterm bug.

## Rendering (shots/)

- xterm-webgl: every SGR style in the showcase (curly and coloured underline, strikethrough, overline, dim, inverse), colour emoji, OSC 8 link underline, box drawing. nvim and btop correct.
- ghostty-web: no overline, curly underline drawn straight, visible seams between block-element cells (upstream #212). nvim and btop correct.
- wterm: no underline or strikethrough at all, monochrome emoji, the 120-cell truecolor bar wrapped early, dashed box-drawing bottoms.
- CJK shows tofu in every engine: a font-fallback gap with `JetBrains Mono, monospace` on this machine, not an engine bug. Check CJK and emoji fallback next to bundled Geist Mono in M3.

## Re-attach (reattach.mjs)

`@xterm/headless` + `@xterm/addon-serialize` 0.14.0 in Node: after 20 MiB of output, serializing the screen plus 1,000 lines of scrollback takes 16 ms (86 KiB); writing it into a fresh terminal takes 8 ms and gives an identical screen and cursor. libghostty-vt has a snapshot API for the same job, but its byte format is outside the ABI promise.

## Not tested

- node-pty inside an Electron `utilityProcess` (the transport spike), and flow control from renderer back to the PTY.
- Input: IME, Kitty keyboard protocol, mouse reporting, selection and copy. `electron . live` exists but was not exercised.
- X11, and a packaged AppImage (the native-modules spike).
- A native (non-wasm) libghostty-vt addon: Ghostty publishes no Linux library binaries, and building one needs Zig 0.17.
