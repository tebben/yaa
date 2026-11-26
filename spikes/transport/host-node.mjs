// Stand-in plugin host as a plain Node child of the core (Electron run as Node), over Node IPC.
process.on('message', (m) => process.send(m));
