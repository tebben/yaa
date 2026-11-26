'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('spike', { report: (r) => ipcRenderer.send('renderer-report', r), sandboxed: process.sandboxed === true });
