# Core transport spike (not for merging)

Results: docs/decisions/0018-core-transport-messageport.md on main.

    pnpm install && (cd node_modules/electron && node install.js)
    ./node_modules/electron/dist/electron main.mjs   # scenario, one JSON line per step
    python3 orphan-check.py                          # does the core outlive a SIGKILLed main?

- main.mjs: forks core.mjs as a utilityProcess, brokers ports, drives the renderer (app/) and logs results.
- Transports compared: `port` (MessagePort in the page), `port-json` (same, JSON strings), `bridge` (port kept in the preload, page calls through contextBridge), `relay` (ipcRenderer through main), `ws` (token and Origin-checked WebSocket served by the core).
- host.mjs: plugin host as a second utilityProcess with a port main brokers; host-node.mjs: plugin host forked by the core over Node IPC.
