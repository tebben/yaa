# 0018 Core transport: utilityProcess and MessagePort, no WebSocket

Status: decided, 2026-11-26. M0 spike, branch `spike/transport` (code in `spikes/transport/`, kept for reference, not merged).

Context: the renderer and the plugin host need a channel to the core that other local processes and web pages cannot reach, that streams chat and terminal output fast, and that survives a page reload and a core crash (`docs/spec/00-overview.md`). The spike forked the core as an Electron `utilityProcess`, opened a hardened window (context isolation, sandbox, CSP) and compared five transports from the same page: a `MessagePort` handed to the page, the same port sending JSON strings, a port kept in the preload and called through `contextBridge`, `ipcRenderer` relayed through main, and a WebSocket served by the core with a token and an `Origin` check.

Versions: Electron 45.5.0 (Node 24.22.3 inside), `ws` 8.23.0, Linux on Wayland. Three runs; ranges below cover them.

## Findings

| Renderer to core | Round trip | 20k events of 200 chars | 200k events of 20 chars | 100 MB in 64 KB strings | One 10 MB message |
| --- | --- | --- | --- | --- | --- |
| Port in the page | 19 to 22 µs | 300k/s | 290k/s, frames up to 117 ms | 0.9 to 1.3 GB/s | 6 to 7 ms |
| Port, JSON strings | 22 to 24 µs | 300k/s | 285k/s | 0.6 to 1.4 GB/s | 10 to 12 ms |
| Port in the preload | 20 to 23 µs | 240k/s | 225k/s | 1.4 to 1.6 GB/s | 6 to 7 ms |
| Relay through main | 55 to 57 µs | 150k/s | 157k/s | 1.5 GB/s | 9 to 10 ms |
| WebSocket | 23 to 25 µs | 265k/s | 245k/s | 1.7 to 1.8 GB/s | 11 ms |

- **Main stays out of the data path.** With main's event loop blocked for 1 s, pings over the port kept flowing (worst round trip 7 to 26 ms); over the relay they stalled for the full second.
- **No network port.** `ss` showed no listening socket for main, core or renderer until the WebSocket was started, which then listened on `127.0.0.1`. The WebSocket checks worked: no token, a wrong token, no `Origin` and a foreign `Origin` were each refused with 403; the app's origin with the token was accepted.
- **Port hand-off:** the preload asks main for a port on every page load; main creates a `MessageChannelMain`, sends one end to the core and the other to the page, and the preload passes it into the page with `window.postMessage`. Load to first connected port took 80 ms from app ready, including the core's fork (48 to 51 ms to ready).
- **Reload:** the core received `close` for each of the old page's ports, the new page had a port 9 to 10 ms after reload, and core state was kept. A second window got its own port and both windows received broadcasts.
- **Core crash:** the page's port fired `close`; main forked a new core and handed out new ports 145 to 149 ms after the crash. In-memory state was lost, as expected.
- **Core lifetime:** the core exits with main, also when main is killed with SIGKILL.
- **Binary data:** `MessagePortMain.postMessage` only transfers ports, so an `ArrayBuffer` from the core is copied, not transferred. Copied 64 KB buffers still ran at 1.8 to 2 GB/s.
- **Many tiny messages block the page.** 200k events in one burst held the renderer's frames for up to 117 ms over a port; 20k larger events did not drop a frame. Ports have no backpressure.
- **Inside a utility process:** only `net` and `systemPreferences` (and two AI modules) are available from `electron`; `utilityProcess` is not, so the core cannot fork a utility process itself. `child_process` works: `git` ran, and Electron's own binary with `ELECTRON_RUN_AS_NODE=1` ran a Node script.
- **Plugin host:** a second `utilityProcess` forked by main (4 ms to spawn) with a port main brokers to the core: 15 µs median round trip. A host forked by the core as Electron-as-Node over Node IPC: 11 µs median, 33 ms to first reply.
- Not verified: native modules (node-pty, SQLite) inside the utility process, which is the native-modules spike; flow control under a real PTY.

## Decision

- The core runs as an Electron `utilityProcess` forked by main. Every page load gets its own `MessagePort` to the core, created by main on the preload's request and passed into the page. The page's typed client from `contracts` talks over that port. The preload does nothing else.
- Messages are plain objects sent by structured clone, validated by the core with the Zod schemas; no JSON encoding on top. Terminal output goes as strings or copied `ArrayBuffer`s.
- No WebSocket and no network port. Dev mode loads the Vite dev server in the Electron window with the same preload (`0015-plugin-ui-loading.md`), and a second window gets its own port, so nothing needs one. A plain browser tab cannot reach the core. If one is ever needed, the checks above (loopback, per-launch token, `Origin`) are the minimum, in a new decision.
- Rejected: the relay through main, which is slower and stalls whenever main is busy; keeping the port in the preload, which costs 20 % on event streams and buys nothing, since any page script could call the bridge as well.
- The plugin host is a second `utilityProcess`. Main forks it when the core asks and brokers a port between them; the core's supervisor decides when to start and restart it, main only carries it out. This keeps Electron's `runAsNode` fuse available to turn off, which forking the host as Electron-as-Node would need.
- Main forks a new core when it exits and hands every open page a new port.

## Consequences for M1

- `apps/desktop` main: fork the core and, on the core's request, the plugin host; broker ports; restart the core on exit. No business logic.
- The protocol client and server in `contracts` work over a port-like interface (`postMessage` plus a message listener), so the same code runs in the page, the core and the plugin host.
- The core coalesces high-frequency events (chat deltas, terminal output) per frame-sized window instead of one message per token or read, and flow control lives in the protocol.
- The core rebuilds its state from SQLite after a restart; pages treat port `close` as "core restarting" and resubscribe on the new port.
- The renderer CSP has no `connect-src` for WebSockets.
