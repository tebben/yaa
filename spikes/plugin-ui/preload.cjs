const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('yaa', {
  onPluginBuilt: (cb) => ipcRenderer.on('plugin:built', (_e, b) => cb(b)),
  report: (r) => ipcRenderer.send('report', r),
});
