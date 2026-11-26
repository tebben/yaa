// Spike harness: node-pty in the main process (the real app keeps PTYs in core), bytes to the renderer over IPC.
// usage: electron . bench [engines] [corpora] | electron . shot [engines] | electron . live <engine>
const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const pty = require('node-pty');

const ALL_ENGINES = ['xterm-webgl', 'xterm-dom', 'ghostty-web', 'ghostty-vt-js', 'wterm-dom', 'wterm-webgl', 'ghostty-1.0.2-raw'];
const ALL_CORPORA = ['plain', 'sgr', 'truecolor', 'unicode', 'tui', 'mixed'];
const args = process.argv.slice(process.defaultApp ? 2 : 1).filter((a) => !a.startsWith('--'));
const [mode = 'live', a1, a2] = args;
const list = (s, all) => (s && s !== 'all' ? s.split(',') : all);

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let win, current;
function spawn(cmd, cols, rows, onExit) {
  const p = pty.spawn('/bin/bash', ['-c', cmd], { cols, rows, cwd: __dirname, env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }, encoding: null });
  let total = 0;
  p.onData((d) => { total += d.length; win.webContents.send('pty:data', d); });
  p.onExit(() => onExit(total));
  return p;
}
ipcMain.on('pty:input', (_e, d) => current?.write(d));
ipcMain.on('pty:resize', (_e, c, r) => current?.resize(c, r));

function load(engine, extra = '') {
  return new Promise((resolve) => {
    ipcMain.once('term:ready', (_e, info) => resolve(info));
    win.loadURL(`app://spike/index.html?engine=${engine}${extra}`);
  });
}
const waitFor = (ch) => new Promise((r) => ipcMain.once(ch, (_e, v) => r(v)));

async function bench() {
  const results = [];
  for (const engine of list(a1, ALL_ENGINES)) for (const corpus of list(a2, ALL_CORPORA)) {
    const info = await load(engine);
    const done = waitFor('bench:result');
    current = spawn(`cat corpus/${corpus}.bin`, info.cols, info.rows, (total) => win.webContents.send('pty:end', total));
    const res = await Promise.race([done, new Promise((r) => setTimeout(() => r(null), 30000))]);
    if (!res) { console.log(`${engine.padEnd(18)} ${corpus.padEnd(10)} TIMEOUT (30 s): ${await win.webContents.executeJavaScript('JSON.stringify(window.benchStatus?.())').catch((e) => 'status unavailable: ' + e.message)}`); results.push({ engine, corpus, timeout: true }); current.kill(); ipcMain.removeAllListeners('bench:result'); continue; }
    const r = { engine, corpus, ...info, ...res };
    results.push(r);
    console.log(`${engine.padEnd(18)} ${corpus.padEnd(10)} ${r.mibs.toFixed(1).padStart(6)} MiB/s  frames ${r.frames}  p95 ${r.p95.toFixed(1)}ms  max ${r.maxFrame.toFixed(0)}ms  >50ms ${r.long}  heap ${r.heapMiB} MiB  ${info.cols}x${info.rows}`);
  }
  fs.writeFileSync(path.join(__dirname, `results-electron-${Date.now()}.json`), JSON.stringify({ electron: process.versions.electron, chrome: process.versions.chrome, ozone: app.commandLine.getSwitchValue('ozone-platform') || 'default', gpu: app.getGPUFeatureStatus(), results }, null, 1));
}
async function shot() {
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  const scenes = { showcase: 'cat corpus/showcase.bin; sleep 1', nvim: 'nvim -u NONE -c "syntax on" -c "set number" gen-showcase.mjs', btop: 'btop' };
  for (const engine of list(a1, ALL_ENGINES.filter((e) => e !== 'ghostty-1.0.2-raw'))) for (const [scene, cmd] of Object.entries(scenes)) {
    const info = await load(engine);
    current = spawn(cmd, info.cols, info.rows, () => {});
    await new Promise((r) => setTimeout(r, scene === 'btop' ? 3500 : 1500));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, 'shots', `${scene}-${engine}.png`), img.toPNG());
    current.kill(); current = undefined;
    console.log('shot', scene, engine);
  }
}
async function live() {
  const info = await load(a1 ?? 'xterm-webgl', '&live=1');
  current = spawn('exec bash -l', info.cols, info.rows, () => app.quit());
}
app.whenReady().then(async () => {
  protocol.handle('app', (req) => net.fetch(pathToFileURL(path.join(__dirname, new URL(req.url).pathname)).toString()));
  win = new BrowserWindow({ width: 1400, height: 900, backgroundColor: '#111', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 'warning') console.log(`  [renderer ${e.level}] ${e.message.slice(0, 300)}`); });
  win.webContents.on('render-process-gone', (_e, d) => console.log('  [renderer gone]', JSON.stringify(d)));
  win.on('unresponsive', () => console.log('  [renderer unresponsive]'));
  if (mode === 'live') return live();
  await (mode === 'shot' ? shot() : bench());
  app.quit();
});
