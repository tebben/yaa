// One page per engine. Bench mode: write every PTY byte, then report throughput and frame stats.
import { Terminal as XTerm } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import * as GhosttyWeb from 'ghostty-web';
import * as GVT from '@gkoreli/ghostty-vt-js/browser-terminal';
import { WTerm } from '@wterm/dom';
import { GhosttyCore } from '@wterm/ghostty';
import { loadGhostty } from '../ghostty-raw.mjs';

const q = new URLSearchParams(location.search);
const engine = q.get('engine');
const live = q.has('live');
const el = document.getElementById('t');
const FONT = { fontFamily: 'JetBrains Mono, monospace', fontSize: 14 };
const SCROLLBACK = 10000;

// Each engine: { cols, rows, write(bytes, done) }
async function makeEngine() {
  switch (engine) {
    case 'xterm-webgl':
    case 'xterm-dom': {
      const t = new XTerm({ ...FONT, scrollback: SCROLLBACK, allowProposedApi: true, cols: 160, rows: 48 });
      t.open(el);
      if (engine === 'xterm-webgl') t.loadAddon(new WebglAddon());
      t.onData((d) => window.pty.input(d));
      t.focus();
      return { cols: t.cols, rows: t.rows, write: (b, cb) => t.write(b, cb) };
    }
    case 'ghostty-web': {
      await GhosttyWeb.init();
      const t = new GhosttyWeb.Terminal({ ...FONT, scrollback: SCROLLBACK, cols: 160, rows: 48 });
      t.open(el);
      t.onData((d) => window.pty.input(d));
      t.focus();
      return { cols: t.cols, rows: t.rows, write: (b, cb) => t.write(b, cb) };
    }
    case 'ghostty-vt-js': {
      GVT.setGhosttyWasmUrl('/node_modules/@gkoreli/ghostty-vt-js/wasm/ghostty-vt.wasm');
      await GVT.init();
      const t = new GVT.Terminal({ ...FONT, renderer: 'auto', scrollback: SCROLLBACK });
      t.onProposal((g) => t.applyGeometry(g));
      t.open(el);
      t.applyGeometry(t.proposal);
      t.onData((d) => window.pty.input(d));
      t.focus();
      return { cols: t.cols, rows: t.rows, write: (b, cb) => t.write(b, cb) };
    }
    case 'wterm-dom':
    case 'wterm-webgl': {
      const core = await GhosttyCore.load({ wasmPath: '/node_modules/@wterm/ghostty/wasm/ghostty-vt.wasm' });
      el.style.fontFamily = FONT.fontFamily;
      el.style.fontSize = `${FONT.fontSize}px`;
      const t = new WTerm(el, { core, renderer: engine === 'wterm-webgl' ? 'webgl' : 'dom', scrollback: SCROLLBACK, cols: 160, rows: 48, onData: (d) => window.pty.input(d) });
      await t.init();
      return { cols: t.cols ?? 160, rows: t.rows ?? 48, write: (b, cb) => { t.write(b); cb(); } };
    }
    case 'null':
      return { cols: 160, rows: 48, write: (_b, cb) => cb() };
    case 'ghostty-1.0.2-raw':
      return rawEngine();
  }
  throw new Error(`unknown engine ${engine}`);
}

// Official libghostty-vt 1.0.2: parse on write, and once per frame walk the dirty rows' cells the way
// our own renderer would (graphemes and style per cell). No pixels are drawn: this is the floor
// cost of the engine plus data extraction in the renderer.
async function rawEngine() {
  const bytes = await (await fetch('/vendor/ghostty-vt-1.0.2-small.wasm')).arrayBuffer();
  const g = await loadGhostty(bytes);
  const x = g.exports, T = g.types.types;
  const cols = 160, rows = 48;
  const term = g.create(cols, rows, SCROLLBACK);
  const opaque = () => { const pp = x.ghostty_wasm_alloc_opaque(); return { pp, take() { const v = x.ghostty_wasm_take_opaque(pp); x.ghostty_wasm_free_opaque(pp); return v; } }; };
  let o = opaque(); x.ghostty_render_state_new(0, o.pp); const rs = o.take();
  o = opaque(); x.ghostty_render_state_row_iterator_new(0, o.pp); const it = o.take();
  o = opaque(); x.ghostty_render_state_row_cells_new(0, o.pp); const cells = o.take();
  const RS = T.GhosttyRenderStateData.values, RD = T.GhosttyRenderStateRowData.values, CD = T.GhosttyRenderStateRowCellsData.values;
  const itSlot = x.ghostty_wasm_alloc(4), cellsSlot = x.ghostty_wasm_alloc(4), u16 = x.ghostty_wasm_alloc(4), u32 = x.ghostty_wasm_alloc(4), style = x.ghostty_wasm_alloc(T.GhosttyStyle.size);
  let cellsVisited = 0, frameWork = 0;
  const frame = () => {
    const t0 = performance.now();
    x.ghostty_render_state_update(rs, term.handle);
    const dv = new DataView(x.memory.buffer);
    dv.setUint32(itSlot, it, true);
    x.ghostty_render_state_get(rs, RS.ROW_ITERATOR, itSlot);
    while (x.ghostty_render_state_row_iterator_next_dirty(it, u16)) {
      new DataView(x.memory.buffer).setUint32(cellsSlot, cells, true);
      x.ghostty_render_state_row_get(it, RD.CELLS, cellsSlot);
      while (x.ghostty_render_state_row_cells_next(cells)) {
        x.ghostty_render_state_row_cells_get(cells, CD.GRAPHEMES_LEN, u32);
        x.ghostty_render_state_row_cells_get(cells, CD.STYLE, style);
        cellsVisited++;
      }
    }
    x.ghostty_render_state_clean(rs);
    frameWork += performance.now() - t0;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  window.rawStats = () => ({ cellsVisited, frameWorkMs: Math.round(frameWork) });
  // Time-sliced write queue, like xterm's WriteBuffer: parse for at most 8 ms, then yield to the frame.
  const queue = [];
  let scheduled = false;
  const drain = () => {
    scheduled = false;
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 8) { const [b, cb] = queue.shift(); term.write(b); cb(); }
    if (queue.length) { scheduled = true; setTimeout(drain, 0); }
  };
  return { cols, rows, write: (b, cb) => { queue.push([b, cb]); if (!scheduled) { scheduled = true; setTimeout(drain, 0); } } };
}

const term = await makeEngine();
window.pty.ready({ cols: term.cols, rows: term.rows });
if (live) {
  window.pty.onData((d) => term.write(d, () => {}));
} else {
  let t0 = 0, received = 0, written = 0, total = -1, lastFrame = 0, finished = false;
  const frames = [];
  let writes = 0, callbacks = 0;
  window.benchStatus = () => ({ received, written, total, writes, callbacks });
  const tick = (now) => { if (lastFrame) frames.push(now - lastFrame); lastFrame = now; if (!finished) requestAnimationFrame(tick); };
  const maybeFinish = () => {
    if (finished || total < 0 || written < total) return;
    finished = true;
    // Two frames after the last byte is parsed, the final screen has been painted.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const ms = performance.now() - t0;
      const sorted = [...frames].sort((a, b) => a - b);
      window.pty.result({
        ms: Math.round(ms), bytes: total, mibs: total / 2 ** 20 / (ms / 1000),
        frames: frames.length, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, maxFrame: sorted.at(-1) ?? 0,
        long: frames.filter((f) => f > 50).length,
        heapMiB: Math.round(performance.memory.usedJSHeapSize / 2 ** 20),
        raw: window.rawStats?.(),
      });
    }));
  };
  window.pty.onData((d) => {
    if (!t0) { t0 = performance.now(); requestAnimationFrame(tick); }
    received += d.length;
    const n = d.length;
    writes++;
    term.write(d, () => { callbacks++; written += n; maybeFinish(); });
  });
  window.pty.onEnd((n) => { total = n; maybeFinish(); });
}
