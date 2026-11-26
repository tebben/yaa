import { app, BrowserWindow, protocol, ipcMain, utilityProcess, net } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DEV = process.env.SPIKE_MODE !== 'prod';
const here = import.meta.dirname;
const log = (o) => console.log(JSON.stringify(o));
const priv = { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true };
protocol.registerSchemesAsPrivileged([{ scheme: 'yaa', privileges: priv }, { scheme: 'yaa-plugin', privileges: priv }]);

const panelFile = path.join(here, 'plugins/hello/src/Panel.svelte');
const original = await readFile(panelFile, 'utf8');
let win, host;
const waiters = [];
const next = (kind) => new Promise((r) => waiters.push({ kind, r }));

ipcMain.on('report', (_e, r) => {
  if (process.env.VERBOSE) log({ from: 'renderer', ...r });
  const i = waiters.findIndex((w) => w.kind.split('|').includes(r.kind));
  if (i >= 0) waiters.splice(i, 1)[0].r(r);
});

const js = (code) => win.webContents.executeJavaScript(code);
const checks = () => js(`(() => {
  const q = (k) => document.querySelector('[data-check="' + k + '"]');
  const cs = (k) => q(k) && getComputedStyle(q(k));
  return {
    label: document.querySelector('[data-label]')?.dataset.label,
    ticks: q('ticks')?.textContent, theme: q('theme')?.textContent,
    stored: q('stored')?.textContent, local: q('local')?.textContent, seen: q('seen')?.textContent,
    buttonTheme: document.querySelector('.btn')?.dataset.theme,
    titleColor: cs('title')?.color, twMissingBg: cs('tw-missing')?.backgroundColor, twMissingPad: cs('tw-missing')?.padding,
    twPresentWeight: cs('tw-present')?.fontWeight, fade: !!q('fade'),
    errors: [...document.querySelectorAll('[data-plugin-error]')].map((e) => e.textContent.slice(0, 160)),
    failed: !!document.querySelector('[data-plugin-failed]'),
    heapMB: (globalThis.gc?.(), Math.round(performance.memory.usedJSHeapSize / 1e5) / 10),
  };
})()`);

async function edit(content) {
  const at = Date.now();
  host?.postMessage({ kind: 'written', id: 'hello', at });
  await writeFile(panelFile, content);
}

async function scenario() {
  log({ step: 'initial', ...(await checks()) });
  await js('__spike.tick(); __spike.tick(); __spike.tick()');
  for (let i = 0; i < 3; i++) await js(`document.querySelector('.btn').click()`);
  await js(`__spike.setTheme('light')`);
  await new Promise((r) => setTimeout(r, 50));
  log({ step: 'after app ticks, 3 clicks, theme light', ...(await checks()) });
  if (!DEV) return;

  const lat = [];
  for (let i = 0; i < 20; i++) {
    const label = `v${i + 2}`;
    const p = next('swapped');
    await edit(original.replace("const label = 'v1'", `const label = '${label}'`));
    const r = await p;
    lat.push({ total: r.swappedAt - r.writtenAt, watch: r.builtAt - r.buildMs - r.writtenAt, build: r.buildMs, load: Math.round(r.loadMs) });
  }
  const sorted = (k) => lat.map((x) => x[k]).sort((a, b) => a - b);
  const stat = (k) => ({ min: sorted(k)[0], median: sorted(k)[10], max: sorted(k).at(-1) });
  log({ step: '20 reloads', total: stat('total'), watchDebounce: stat('watch'), build: stat('build'), load: stat('load') });
  log({ step: 'after reloads', ...(await checks()) });

  let p = next('build-failed');
  await edit(original.replace('</script>', 'let x = ;\n</script>'));
  log({ step: 'syntax error', build: await p, ...(await checks()) });

  p = next('swapped');
  await edit(original.replace("const label = 'v1';", "const label = 'boom'; throw new Error('init failed');"));
  await p;
  log({ step: 'throws during init', ...(await checks()) });

  p = next('swapped|build-failed');
  await edit(original.replace("import { getContext } from 'svelte';", "import { getContext } from 'svelte';\nimport { Tween } from 'svelte/motion'; console.log(Tween);"));
  await p;
  log({ step: 'imports an unshared module', ...(await checks()) });
  p = next('swapped');
  await edit(original.replace("const label = 'v1'", "const label = 'recovered'"));
  await p;
  log({ step: 'fixed after failures', ...(await checks()) });

  for (let i = 0; i < 100; i++) {
    p = next('swapped');
    await edit(original.replace("const label = 'v1'", `const label = 'leak${i}'`));
    await p;
  }
  log({ step: 'after 100 more reloads', ...(await checks()) });

  p = next('swapped');
  await edit(original);
  await p;
  log({ step: 'restored', ...(await checks()) });
}

app.whenReady().then(async () => {
  protocol.handle('yaa', (req) => {
    const u = new URL(req.url);
    return net.fetch(pathToFileURL(path.join(here, 'dist/app', u.pathname)).toString());
  });
  protocol.handle('yaa-plugin', async (req) => {
    const u = new URL(req.url);
    const file = path.join(here, 'plugins', u.host, 'dist', u.pathname);
    const body = await readFile(file);
    const type = file.endsWith('.css') ? 'text/css' : 'text/javascript';
    return new Response(body, { headers: { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
  });

  win = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.webContents.on('console-message', (e) => log({ console: e.message }));
  const t0 = Date.now();
  await win.loadURL(DEV ? 'http://localhost:5173/' : 'yaa://app/index.html');
  log({ step: 'loaded', mode: DEV ? 'dev' : 'prod', ms: Date.now() - t0 });

  const first = next('swapped');
  if (DEV) {
    host = utilityProcess.fork(path.join(here, 'plugin-host.mjs'));
    host.on('message', (m) => {
      if (process.env.VERBOSE || m.kind !== 'built') log({ from: 'host', ...m });
      if (m.kind === 'built') win.webContents.send('plugin:built', m);
    });
  } else {
    win.webContents.send('plugin:built', { id: 'hello', version: 1, buildMs: 0, ok: true, errors: [] });
  }
  await first;
  try { await scenario(); } catch (e) { log({ error: String(e.stack) }); }
  await writeFile(panelFile, original);
  app.quit();
});
