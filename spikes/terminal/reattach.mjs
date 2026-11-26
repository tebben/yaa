// Can core keep a headless mirror and hand a new renderer the current screen? xterm headless + serialize.
import fs from 'node:fs';
import H from '@xterm/headless';
import S from '@xterm/addon-serialize';
const src = new H.Terminal({ cols: 160, rows: 48, scrollback: 10000, allowProposedApi: true });
const ser = new S.SerializeAddon(); src.loadAddon(ser);
const buf = fs.readFileSync('corpus/mixed.bin');
await new Promise((r) => src.write(buf, r));
await new Promise((r) => src.write(fs.readFileSync('corpus/showcase.bin'), r));
let t0 = performance.now(); const snap = ser.serialize({ scrollback: 1000 }); const serMs = performance.now() - t0;
const dst = new H.Terminal({ cols: 160, rows: 48, scrollback: 10000, allowProposedApi: true });
t0 = performance.now(); await new Promise((r) => dst.write(snap, r)); const restoreMs = performance.now() - t0;
const screen = (t) => { const b = t.buffer.active, out = []; for (let i = b.baseY; i < b.baseY + t.rows; i++) out.push(b.getLine(i).translateToString(true)); return out.join('\n'); };
console.log(`serialize ${serMs.toFixed(0)} ms, ${(snap.length / 1024).toFixed(0)} KiB (1000 lines scrollback); restore ${restoreMs.toFixed(0)} ms; screen identical: ${screen(src) === screen(dst)}; cursor ${src.buffer.active.cursorX},${src.buffer.active.cursorY} vs ${dst.buffer.active.cursorX},${dst.buffer.active.cursorY}`);
