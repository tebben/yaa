// Backend module reload: re-import with a query string. ESM never evicts, so measure growth.
import { writeFile } from 'node:fs/promises';
const file = new URL('./mod.mjs', import.meta.url);
const pad = 'x'.repeat(6000);
const heap = () => (globalThis.gc(), Math.round(process.memoryUsage().heapUsed / 1e5) / 10);
const h0 = heap();
const times = [];
for (let i = 0; i < 200; i++) {
  await writeFile(file, `export const pad = ${JSON.stringify(pad)}; export function activate(){ return ${i}; }`);
  const t = performance.now();
  const m = await import(`${file}?v=${i}`);
  times.push(performance.now() - t);
  if (m.activate() !== i) throw new Error('stale');
}
times.sort((a, b) => a - b);
console.log(JSON.stringify({ reloads: 200, importMsMedian: +times[100].toFixed(2), heapStartMB: h0, heapEndMB: heap() }));
