// Sanity check: after each corpus, the last screen lines and scrollback depth of ghostty 1.0.2 vs xterm.
import fs from 'node:fs';
import H from '@xterm/headless';
import { loadGhostty } from './ghostty-raw.mjs';
const g = await loadGhostty(fs.readFileSync('vendor/ghostty-vt-1.0.2.wasm'));
const x = g.exports, T = g.types.types;
function ghosttyText(t) {
  const pp = x.ghostty_wasm_alloc_opaque(); x.ghostty_formatter_terminal_new(0, pp, t.handle);
  const f = x.ghostty_wasm_take_opaque(pp); x.ghostty_wasm_free_opaque(pp);
  const e = x.ghostty_wasm_alloc(4); new DataView(x.memory.buffer).setInt32(e, T.GhosttyFormatterFormat.values.PLAIN, true);
  x.ghostty_formatter_set(f, T.GhosttyFormatterOption.values.EMIT, e);
  const op = x.ghostty_wasm_alloc_opaque(), ol = x.ghostty_wasm_alloc(4);
  const r = x.ghostty_formatter_format_alloc(f, 0, op, ol); if (r) throw new Error('fmt ' + r);
  const out = x.ghostty_wasm_take_opaque(op), len = new DataView(x.memory.buffer).getUint32(ol, true);
  const s = new TextDecoder().decode(new Uint8Array(x.memory.buffer, out, len)); x.ghostty_free(0, out, len); x.ghostty_formatter_free(f);
  return s;
}
for (const name of ['plain', 'sgr', 'unicode', 'tui']) {
  const buf = fs.readFileSync(`corpus/${name}.bin`);
  const gt = g.create(160, 48, 10000); const xt = new H.Terminal({ cols: 160, rows: 48, scrollback: 10000, allowProposedApi: true });
  for (let i = 0; i < buf.length; i += 65536) { gt.write(buf.subarray(i, i + 65536)); }
  await new Promise((r) => xt.write(buf, r));
  const gl = ghosttyText(gt).split('\n'); const b = xt.buffer.active;
  const xl = []; for (let i = 0; i < b.length; i++) xl.push(b.getLine(i).translateToString(true));
  while (xl.length && xl.at(-1) === '') xl.pop(); while (gl.length && gl.at(-1) === '') gl.pop();
  const same = gl.slice(-40).join('\n') === xl.slice(-40).join('\n');
  console.log(name.padEnd(8), 'ghostty lines', gl.length, 'xterm lines', xl.length, 'last 40 lines identical:', same);
  if (!same) { console.log(' g:', JSON.stringify(gl.at(-1)).slice(0, 160)); console.log(' x:', JSON.stringify(xl.at(-1)).slice(0, 160)); }
  gt.dispose(); xt.dispose();
}
