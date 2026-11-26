'use strict';
const { app, BrowserWindow, utilityProcess, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { probeAll } = require('@spike/core');

const t0 = Date.now();
const out = process.env.SPIKE_OUT;
const result = { packaged: app.isPackaged, argv: process.argv.slice(1), env: { XDG_SESSION_TYPE: process.env.XDG_SESSION_TYPE, WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || null, DISPLAY: process.env.DISPLAY || null, APPIMAGE: process.env.APPIMAGE || null } };

function finish() {
  result.totalMs = Date.now() - t0;
  const s = JSON.stringify(result, null, 2);
  if (out) fs.writeFileSync(out, s); else console.log(s);
  if (!process.env.SPIKE_KEEP) app.quit();
}

app.whenReady().then(async () => {
  result.ozone = app.commandLine.getSwitchValue('ozone-platform') || null;
  result.main = await probeAll();
  const child = utilityProcess.fork(path.join(__dirname, 'core-child.cjs'), [], { serviceName: 'spike-core' });
  const utility = new Promise((res) => child.once('message', res));
  const win = new BrowserWindow({ width: 640, height: 480, show: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const renderer = new Promise((res) => ipcMain.once('renderer-report', (_e, r) => res(r)));
  win.loadFile(path.join(__dirname, 'index.html'));
  result.utility = await utility;
  result.renderer = await renderer;
  // OS-level sandbox: a sandboxed renderer runs under seccomp-bpf (mode 2) and, with the
  // namespace sandbox, in its own user namespace; --no-sandbox leaves both off.
  const pid = win.webContents.getOSProcessId();
  const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
  result.osSandbox = {
    noSandboxSwitch: app.commandLine.hasSwitch('no-sandbox'),
    rendererSeccomp: Number(/^Seccomp:\s+(\d)/m.exec(status)[1]),
    rendererOwnUserNs: fs.readlinkSync(`/proc/${pid}/ns/user`) !== fs.readlinkSync('/proc/self/ns/user'),
  };
  result.windowShownMs = Date.now() - t0;
  const img = await win.webContents.capturePage();
  result.capture = img.getSize();
  if (process.env.SPIKE_SHOT) fs.writeFileSync(process.env.SPIKE_SHOT, img.toPNG());
  child.kill();
  finish();
});
