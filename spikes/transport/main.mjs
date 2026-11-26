import { app, BrowserWindow, protocol, ipcMain, utilityProcess, MessageChannelMain, net } from 'electron';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import WebSocket from 'ws';

const here = import.meta.dirname;
const ORIGIN = 'yaa://app';
const log = (o) => console.log(JSON.stringify(o));
protocol.registerSchemesAsPrivileged([{ scheme: 'yaa', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let core, coreReady, wsInfo;
const windows = new Set();
const waiters = [];
const waitFor = (pred) => new Promise((r) => waiters.push({ pred, r }));

function startCore() {
  const t0 = performance.now();
  core = utilityProcess.fork(path.join(here, 'core.mjs'), [], { serviceName: 'yaa-core', stdio: 'inherit' });
  coreReady = new Promise((resolve) => {
    core.on('message', function first(m) {
      if (m.kind !== 'ready') return;
      core.off('message', first);
      resolve({ ...m, forkToReadyMs: Math.round(performance.now() - t0) });
    });
  });
  core.on('message', (m) => {
    if (m.kind === 'relay') for (const w of windows) w.webContents.send('core:relay', m.msg);
    else if (m.kind === 'log') log({ from: 'core', ...m });
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.r(m); }
  });
  core.on('exit', (code) => log({ event: 'core exit', code }));
  wsInfo = undefined;
}

ipcMain.on('core:connect', (e, as) => {
  const { port1, port2 } = new MessageChannelMain();
  core.postMessage({ kind: 'connect', as }, [port1]);
  e.sender.postMessage('core:port', as, [port2]);
});
ipcMain.on('core:relay', (_e, msg) => core.postMessage({ kind: 'relay', msg }));
ipcMain.handle('core:ws', async () => {
  if (!wsInfo) {
    core.postMessage({ kind: 'ws', origin: ORIGIN });
    wsInfo = await waitFor((m) => m.kind === 'ws');
  }
  return { port: wsInfo.port, token: wsInfo.token };
});

async function openWindow() {
  const w = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false },
  });
  w.webContents.on('console-message', (e) => log({ console: e.message }));
  windows.add(w);
  w.on('closed', () => windows.delete(w));
  await w.loadURL(`${ORIGIN}/index.html`);
  return w;
}

const js = (w, code) => w.webContents.executeJavaScript(code);
const busy = (ms) => { const end = Date.now() + ms; while (Date.now() < end); };

function listening(pids) {
  const out = execFileSync('ss', ['-tlnpH']).toString();
  return out.split('\n').filter((l) => pids.some((p) => l.includes(`pid=${p},`))).map((l) => l.trim().split(/\s+/)[3]);
}

function tryWs(url, origin) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, origin ? { origin } : {});
    ws.on('open', () => { ws.close(); resolve('accepted'); });
    ws.on('unexpected-response', (_r, res) => resolve(`rejected ${res.statusCode}`));
    ws.on('error', (e) => resolve(`error ${e.message}`));
  });
}

async function scenario() {
  const tReady = performance.now();
  startCore();
  const ready = await coreReady;
  log({ step: 'core ready', ...ready });
  const win = await openWindow();
  await js(win, `__spike.connect('port')`);
  log({ step: 'window loaded and port connected', msFromAppReady: Math.round(performance.now() - tReady) });

  log({ step: 'spawn from core', ...(await js(win, `__spike.call('port', { op: 'spawn' })`)) });
  log({ step: 'listening sockets before ws', sockets: listening([process.pid, core.pid, win.webContents.getOSProcessId()]) });

  const kinds = ['port', 'port-json', 'bridge', 'relay', 'ws'];
  for (const k of kinds.slice(1)) await js(win, `__spike.connect('${k}')`);
  log({ step: 'listening sockets with ws', sockets: listening([core.pid]) });

  for (const k of kinds) log({ step: 'ping', kind: k, ...(await js(win, `__spike.ping('${k}')`)) });
  for (const k of kinds) log({ step: 'stream 20k x 200 chars', kind: k, ...(await js(win, `__spike.stream('${k}', 20000, 200)`)) });
  for (const k of kinds) log({ step: 'stream 200k x 20 chars', kind: k, ...(await js(win, `__spike.stream('${k}', 200000, 20)`)) });
  for (const k of kinds) log({ step: 'bytes 100 MB string', kind: k, ...(await js(win, `__spike.bytes('${k}', 100e6, 65536, false)`)) });
  for (const k of ['port', 'ws']) log({ step: 'bytes 100 MB binary', kind: k, ...(await js(win, `__spike.bytes('${k}', 100e6, 65536, true)`)) });
  for (const k of kinds) log({ step: 'one 10 MB message', kind: k, ...(await js(win, `__spike.big('${k}', 10e6)`)) });
  log({ step: 'renderer heap', MB: await js(win, '__spike.heapMB()') });

  for (const k of ['port', 'relay']) {
    setTimeout(() => busy(1000), 300);
    log({ step: 'ping for 1.5 s while main is busy for 1 s', kind: k, ...(await js(win, `__spike.pingFor('${k}', 1500)`)) });
  }

  const { port, token } = wsInfo;
  log({
    step: 'ws access checks',
    noToken: await tryWs(`ws://127.0.0.1:${port}/`, ORIGIN),
    wrongToken: await tryWs(`ws://127.0.0.1:${port}/?token=nope`, ORIGIN),
    tokenNoOrigin: await tryWs(`ws://127.0.0.1:${port}/?token=${token}`),
    tokenWebOrigin: await tryWs(`ws://127.0.0.1:${port}/?token=${token}`, 'https://evil.example'),
    tokenAppOrigin: await tryWs(`ws://127.0.0.1:${port}/?token=${token}`, ORIGIN),
  });

  // Reload: the core keeps state; the page asks for a new port.
  for (let i = 0; i < 5; i++) await js(win, `__spike.send('port', { op: 'inc' })`);
  await new Promise((r) => setTimeout(r, 50));
  const before = await js(win, `__spike.call('port', { op: 'state' })`);
  const closedLog = waitFor((m) => m.kind === 'log' && m.event === 'port closed');
  const tReload = performance.now();
  win.webContents.reload();
  await new Promise((r) => win.webContents.once('did-finish-load', r));
  await js(win, `__spike.connect('port')`);
  const after = await js(win, `__spike.call('port', { op: 'state' })`);
  log({ step: 'reload', reloadToPortMs: Math.round(performance.now() - tReload), before: before.counter, after: after.counter, clientsBefore: before.clients, clientsAfter: after.clients, closeSeen: !!(await Promise.race([closedLog, new Promise((r) => setTimeout(r, 500))])) });

  // Second window sees the same state and both get broadcasts.
  const win2 = await openWindow();
  await js(win2, `__spike.connect('port')`);
  await js(win2, `__spike.send('port', { op: 'inc' })`);
  await new Promise((r) => setTimeout(r, 50));
  log({ step: 'second window', win1: (await js(win, '__spike.state()')).counter, win2: (await js(win2, '__spike.state()')).counter });

  // Plugin host: main brokers a port between two utility processes.
  const tHost = performance.now();
  const host = utilityProcess.fork(path.join(here, 'host.mjs'), [], { serviceName: 'yaa-plugin-host' });
  await new Promise((r) => host.once('spawn', r));
  const { port1, port2 } = new MessageChannelMain();
  core.postMessage({ kind: 'connect', as: 'host' }, [port1]);
  host.postMessage({}, [port2]);
  log({ step: 'main forks plugin host as utilityProcess', forkToSpawnMs: Math.round(performance.now() - tHost) });
  log({ step: 'core <-> plugin host ping', ...(await js(win, `__spike.call('port', { op: 'hostping', n: 2000 })`)) });

  log({ step: 'core forks host over Node IPC, ping', ...(await js(win, `__spike.call('port', { op: 'nodehostping', n: 2000 })`)) });

  // Core crash: main restarts it; pages see their ports close and reconnect.
  const tCrash = performance.now();
  const exited = new Promise((r) => core.once('exit', r));
  js(win, `__spike.send('port', { op: 'crash' })`);
  await exited;
  await new Promise((r) => setTimeout(r, 100));
  const closed = (await js(win, '__spike.state()')).closed;
  startCore();
  await coreReady;
  await js(win, `__spike.connect('port')`);
  const s = await js(win, `__spike.call('port', { op: 'state' })`);
  log({ step: 'core crash and restart', crashToNewPortMs: Math.round(performance.now() - tCrash), pageSawClose: closed, counterAfterRestart: s.counter });

  host.kill();
}

app.whenReady().then(async () => {
  protocol.handle('yaa', (req) => net.fetch(pathToFileURL(path.join(here, 'app', new URL(req.url).pathname)).toString()));
  try { await scenario(); } catch (e) { log({ error: String(e.stack) }); }
  app.quit();
});
