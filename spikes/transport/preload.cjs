const { contextBridge, ipcRenderer } = require('electron');

// Main-world port: the preload passes the port into the page with window.postMessage.
ipcRenderer.on('core:port', (e, as) => {
  if (as === 'bridge') return bridgePort(e.ports[0]);
  window.postMessage({ yaa: 'core-port', as }, location.origin, e.ports);
});

// Bridge port: the port stays in the preload; the page calls functions across contextBridge.
let port;
const listeners = [];
function bridgePort(p) {
  port = p;
  port.onmessage = (e) => { for (const l of listeners) l(e.data); };
}

const relayListeners = [];
ipcRenderer.on('core:relay', (_e, m) => { for (const l of relayListeners) l(m); });

contextBridge.exposeInMainWorld('yaa', {
  connect: (as) => ipcRenderer.send('core:connect', as),
  bridge: { send: (m) => port.postMessage(m), onMessage: (cb) => listeners.push(cb) },
  relay: { send: (m) => ipcRenderer.send('core:relay', m), onMessage: (cb) => relayListeners.push(cb) },
  wsInfo: () => ipcRenderer.invoke('core:ws'),
});
