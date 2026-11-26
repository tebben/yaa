// Headless parse throughput in Node: VT state kept in core, no rendering.
// usage: node bench-headless.mjs <xterm|ghostty-vt-js|ghostty-1.0.2|ghostty-1.0.2-small> [corpus...]
import fs from 'node:fs';
const [engine, ...names] = process.argv.slice(2);
const corpora = names.length ? names : ['plain', 'sgr', 'truecolor', 'unicode', 'tui', 'mixed'];
const COLS = 160, ROWS = 48, SCROLLBACK = 10000, CHUNK = 64 * 1024;

async function make() {
  if (engine === 'xterm') {
    const { default: H } = await import('@xterm/headless');
    const t = new H.Terminal({ cols: COLS, rows: ROWS, scrollback: SCROLLBACK, allowProposedApi: true });
    return { write: (b) => new Promise((r) => t.write(b, r)), dispose: () => t.dispose() };
  }
  if (engine.startsWith('ghostty-1.0.2')) {
    const { loadGhostty } = await import('./ghostty-raw.mjs');
    const file = engine.endsWith('small') ? 'vendor/ghostty-vt-1.0.2-small.wasm' : 'vendor/ghostty-vt-1.0.2.wasm';
    globalThis.__g ??= await loadGhostty(fs.readFileSync(file));
    return globalThis.__g.create(COLS, ROWS, SCROLLBACK);
  }
  const m = await import('@gkoreli/ghostty-vt-js/terminal-screen-emulator');
  const s = await m.createTerminalScreen({ columns: COLS, rows: ROWS, maxScrollbackLines: SCROLLBACK });
  return { write: (b) => s.write(b), dispose: () => s.dispose() };
}
for (const name of corpora) {
  const buf = fs.readFileSync(`corpus/${name}.bin`);
  const times = [];
  for (let run = 0; run < 3; run++) {
    const t = await make();
    const t0 = performance.now();
    for (let i = 0; i < buf.length; i += CHUNK) await t.write(buf.subarray(i, i + CHUNK));
    times.push(performance.now() - t0);
    t.dispose();
  }
  times.sort((a, b) => a - b);
  const mibs = buf.length / 2 ** 20 / (times[1] / 1000);
  console.log(`${engine.padEnd(20)} ${name.padEnd(10)} ${mibs.toFixed(1).padStart(7)} MiB/s  (median ${times[1].toFixed(0)} ms)  rss ${(process.memoryUsage().rss / 2 ** 20).toFixed(0)} MiB`);
}
