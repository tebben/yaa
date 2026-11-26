// Dev-mode plugin host: one esbuild context per plugin, rebuilt on change.
// Runs as an Electron utilityProcess; results go to main over parentPort.
import * as esbuild from 'esbuild';
import { watch } from 'node:fs';
import path from 'node:path';
import { options } from './compile.mjs';

const root = path.resolve(import.meta.dirname, 'plugins');
const post = (m) => process.parentPort.postMessage(m);
const ctxs = new Map();
let pendingWrite = new Map();

process.parentPort.on('message', (e) => {
  if (e.data.kind === 'written') pendingWrite.set(e.data.id, e.data.at);
});

async function start(id) {
  const dir = path.join(root, id);
  const t0 = performance.now();
  const ctx = await esbuild.context(options(dir));
  ctxs.set(id, { ctx, version: 0 });
  post({ kind: 'context', id, ms: Math.round(performance.now() - t0) });
  await rebuild(id);
  let timer;
  watch(path.join(dir, 'src'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(id), 20);
  });
}

async function rebuild(id) {
  const c = ctxs.get(id);
  const t0 = performance.now();
  try {
    await c.ctx.rebuild();
    c.version++;
    post({ kind: 'built', id, version: c.version, buildMs: Math.round(performance.now() - t0), ok: true, errors: [], builtAt: Date.now(), writtenAt: pendingWrite.get(id) });
  } catch (e) {
    post({ kind: 'built', id, version: c.version, buildMs: Math.round(performance.now() - t0), ok: false, errors: (e.errors ?? [e]).map((x) => x.text ?? String(x)), writtenAt: pendingWrite.get(id) });
  }
  pendingWrite.delete(id);
}

const t0 = performance.now();
for (const id of ['hello']) await start(id);
post({ kind: 'ready', ms: Math.round(performance.now() - t0) });
