const transports = {};
const pending = new Map();
let nextId = 1;
const state = { counter: null, broadcasts: 0, closed: [] };

function dispatch(kind, raw) {
  const m = typeof raw === 'string' ? JSON.parse(raw) : raw instanceof ArrayBuffer ? { op: 'out', data: raw, wsBinary: true } : raw;
  if (m.op === 'state' && m.id === undefined) {
    state.counter = m.counter;
    state.broadcasts++;
    document.getElementById('state').textContent = `counter ${m.counter}`;
    return;
  }
  const id = m.wsBinary ? transports[kind].bytesId : m.id;
  pending.get(id)?.(m);
}

function connectPort(as) {
  return new Promise((resolve) => {
    const onMsg = (e) => {
      if (e.source !== window || e.data?.yaa !== 'core-port' || e.data.as !== as) return;
      window.removeEventListener('message', onMsg);
      const port = e.ports[0];
      port.onmessage = (ev) => dispatch(as, ev.data);
      port.addEventListener('close', () => state.closed.push({ as, at: Date.now() }));
      const json = as.endsWith('json');
      transports[as] = { send: (m) => port.postMessage(json ? JSON.stringify(m) : m), port };
      resolve();
    };
    window.addEventListener('message', onMsg);
    yaa.connect(as);
  });
}

async function connect(kind) {
  if (kind === 'port' || kind === 'port-json') return connectPort(kind);
  if (kind === 'bridge') {
    yaa.connect('bridge');
    yaa.bridge.onMessage((m) => dispatch('bridge', m));
    transports.bridge = { send: yaa.bridge.send };
    await new Promise((r) => setTimeout(r, 100));
    return;
  }
  if (kind === 'relay') {
    yaa.relay.onMessage((m) => dispatch('relay', m));
    transports.relay = { send: yaa.relay.send };
    return;
  }
  if (kind === 'ws') {
    const { port, token } = await yaa.wsInfo();
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${token}`);
    ws.binaryType = 'arraybuffer';
    ws.onmessage = (e) => dispatch('ws', e.data);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    transports.ws = { send: (m) => ws.send(JSON.stringify(m)) };
  }
}

function request(kind, msg, onEach) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, (m) => {
      if (onEach?.(m)) return;
      pending.delete(id);
      resolve(m);
    });
    transports[kind].send({ ...msg, id });
  });
}

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(3); };

// performance.now() is coarse in the renderer, so report the mean over batches of 100 sequential round trips.
async function ping(kind, batches = 50) {
  for (let i = 0; i < 200; i++) await request(kind, { op: 'ping' });
  const mean = [];
  for (let b = 0; b < batches; b++) {
    const t = performance.now();
    for (let i = 0; i < 100; i++) await request(kind, { op: 'ping' });
    mean.push(((performance.now() - t) / 100) * 1000);
  }
  return { meanRttUs: Math.round(mean.reduce((a, x) => a + x) / batches), worstBatchUs: Math.round(Math.max(...mean)) };
}

function frameGaps() {
  let last = performance.now(), max = 0, on = true;
  const tick = (t) => { max = Math.max(max, t - last); last = t; if (on) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return () => { on = false; return +max.toFixed(1); };
}

async function stream(kind, n, size) {
  const stop = frameGaps();
  const t = performance.now();
  let got = 0;
  await new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, () => { if (++got === n) { pending.delete(id); resolve(); } });
    transports[kind].send({ op: 'stream', n, size, id });
  });
  const ms = performance.now() - t;
  return { n, size, ms: Math.round(ms), eventsPerSec: Math.round(n / (ms / 1000)), maxFrameGapMs: stop() };
}

async function bytes(kind, total, chunk, binary) {
  const stop = frameGaps();
  const t = performance.now();
  let received = 0;
  if (kind === 'ws') transports.ws.bytesId = nextId;
  await request(kind, { op: 'bytes', total, chunk, binary }, (m) => {
    if (m.op !== 'out') return false;
    received += typeof m.data === 'string' ? m.data.length : m.data.byteLength;
    return true;
  });
  const ms = performance.now() - t;
  return { MB: total / 1e6, chunk, binary, ms: Math.round(ms), MBps: Math.round(received / 1e6 / (ms / 1000)), maxFrameGapMs: stop() };
}

async function big(kind, size) {
  const t = performance.now();
  const m = await request(kind, { op: 'big', bytes: size });
  return { MB: size / 1e6, ms: Math.round(performance.now() - t), ok: m.data.length === size };
}

async function pingFor(kind, ms) {
  const end = performance.now() + ms;
  const rtt = [];
  while (performance.now() < end) {
    const t = performance.now();
    await request(kind, { op: 'ping' });
    rtt.push(performance.now() - t);
  }
  return { n: rtt.length, p50ms: pct(rtt, 0.5), maxms: pct(rtt, 1) };
}

window.__spike = {
  connect, ping, stream, bytes, big, pingFor,
  call: (kind, msg) => request(kind, msg),
  send: (kind, msg) => transports[kind].send(msg),
  state: () => ({ ...state, transports: Object.keys(transports) }),
  heapMB: () => Math.round(performance.memory.usedJSHeapSize / 1e5) / 10,
};
