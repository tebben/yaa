const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pty', {
  onData: (f) => ipcRenderer.on('pty:data', (_e, d) => f(d)),
  onEnd: (f) => ipcRenderer.on('pty:end', (_e, n) => f(n)),
  input: (d) => ipcRenderer.send('pty:input', d),
  resize: (c, r) => ipcRenderer.send('pty:resize', c, r),
  ready: (info) => ipcRenderer.send('term:ready', info),
  result: (r) => ipcRenderer.send('bench:result', r),
});
