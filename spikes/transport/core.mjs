// Core as an Electron utilityProcess. Serves the same ops over MessagePorts,
// the main-process relay (parentPort) and an optional WebSocket.
import { fork, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';

const startedAt = Date.now();
let counter = 0;
let hostPort, hostWait;
const clients = new Set(); // { send(msg), kind }
const log = (o) => process.parentPort.postMessage({ kind: 'log', ...o });

function run(cmd, args, env) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { env: { ...process.env, ...env } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('error', (e) => resolve({ ok: false, out: String(e) }));
    p.on('exit', (code) => resolve({ ok: code === 0, out: out.trim() }));
  });
}

function broadcast(msg) {
  for (const c of clients) c.send(msg);
}

async function handle(client, m) {
  const reply = (r) => client.send({ ...r, id: m.id });
  switch (m.op) {
    case 'ping':
      return reply({ op: 'pong', t: m.t });
    case 'stream': {
      // Chat-like deltas: n events of `size` characters, sent as fast as possible.
      const text = 'x'.repeat(m.size);
      for (let i = 0; i < m.n; i++) client.send({ op: 'delta', id: m.id, seq: i, sessionId: 's1', text });
      return;
    }
    case 'bytes': {
      // Terminal-like output: total bytes in chunks; binary chunks are transferred ArrayBuffers.
      const chunk = 'y'.repeat(m.chunk);
      for (let sent = 0; sent < m.total; sent += m.chunk) {
        if (m.binary) {
          // MessagePortMain only transfers ports, so the buffer is copied.
          client.send({ op: 'out', id: m.id, data: new Uint8Array(m.chunk).fill(121).buffer });
        } else client.send({ op: 'out', id: m.id, data: chunk });
      }
      return reply({ op: 'out-end' });
    }
    case 'big':
      return reply({ op: 'big', data: 'z'.repeat(m.bytes) });
    case 'inc':
      counter++;
      return broadcast({ op: 'state', counter });
    case 'state':
      return reply({ op: 'state', counter, pid: process.pid, startedAt, clients: [...clients].map((c) => c.kind) });
    case 'spawn': {
      const git = await run('git', ['--version']);
      // An agent written in JS: Electron's own binary run as Node.
      const asNode = await run(process.execPath, ['-e', 'console.log(process.versions.node)'], { ELECTRON_RUN_AS_NODE: '1' });
      return reply({ op: 'spawned', git, asNode, execPath: process.execPath });
    }
    case 'hostping': {
      const rtt = [];
      for (let i = 0; i < m.n; i++) {
        const t = performance.now();
        await new Promise((r) => { hostWait = r; hostPort.postMessage({ i }); });
        rtt.push(performance.now() - t);
      }
      rtt.sort((a, b) => a - b);
      return reply({ op: 'hostpong', p50ms: +rtt[rtt.length >> 1].toFixed(3), p99ms: +rtt[Math.floor(rtt.length * 0.99)].toFixed(3) });
    }
    case 'nodehostping': {
      // The core forks the host itself: Electron's binary as Node, Node IPC with structured clone.
      const t0 = performance.now();
      const child = fork(new URL('./host-node.mjs', import.meta.url).pathname, [], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, serialization: 'advanced' });
      let wait;
      child.on('message', () => wait());
      const ask = () => new Promise((r) => { wait = r; child.send({ i: 0, text: 'x'.repeat(100) }); });
      await ask();
      const firstMs = +(performance.now() - t0).toFixed(1);
      const rtt = [];
      for (let i = 0; i < m.n; i++) {
        const t = performance.now();
        await ask();
        rtt.push(performance.now() - t);
      }
      child.kill();
      rtt.sort((a, b) => a - b);
      return reply({ op: 'nodehostpong', forkToFirstReplyMs: firstMs, p50ms: +rtt[rtt.length >> 1].toFixed(3), p99ms: +rtt[Math.floor(rtt.length * 0.99)].toFixed(3) });
    }
    case 'crash':
      process.exit(3);
  }
}

function addPort(port, kind) {
  const client = {
    kind,
    send: (msg) => port.postMessage(kind.endsWith('json') ? JSON.stringify(msg) : msg),
  };
  clients.add(client);
  port.on('message', (e) => handle(client, typeof e.data === 'string' ? JSON.parse(e.data) : e.data));
  port.on('close', () => {
    clients.delete(client);
    log({ event: 'port closed', as: kind, clients: [...clients].map((c) => c.kind) });
  });
  port.start();
}

const relay = { kind: 'relay', send: (msg) => process.parentPort.postMessage({ kind: 'relay', msg }) };
clients.add(relay);

let wss;
const token = randomBytes(32).toString('hex');
function startWebSocket(origin) {
  wss = new WebSocketServer({
    host: '127.0.0.1',
    port: 0,
    maxPayload: 64 * 1024 * 1024,
    verifyClient: ({ req, origin: o }, done) => {
      const t = new URL(req.url, 'http://x').searchParams.get('token');
      const ok = t === token && o === origin;
      if (!ok) log({ event: 'ws rejected', origin: o ?? null, tokenOk: t === token });
      done(ok, 403);
    },
  });
  wss.on('connection', (ws) => {
    const client = { kind: 'ws', send: (msg) => ws.send(msg.data instanceof ArrayBuffer ? msg.data : JSON.stringify(msg)) };
    clients.add(client);
    ws.on('message', (d) => handle(client, JSON.parse(d)));
    ws.on('close', () => clients.delete(client));
  });
  return new Promise((r) => wss.on('listening', () => r(wss.address().port)));
}

process.parentPort.on('message', async (e) => {
  const m = e.data;
  if (m.kind === 'connect' && m.as === 'host') {
    hostPort = e.ports[0];
    hostPort.on('message', () => hostWait());
    hostPort.start();
  } else if (m.kind === 'connect') addPort(e.ports[0], m.as);
  else if (m.kind === 'relay') handle(relay, m.msg);
  else if (m.kind === 'ws') process.parentPort.postMessage({ kind: 'ws', port: await startWebSocket(m.origin), token });
});

let electronInUtility;
try {
  const e = await import('electron');
  electronInUtility = { keys: Object.keys(e.default ?? e).sort(), utilityProcess: typeof (e.default ?? e).utilityProcess };
} catch (err) {
  electronInUtility = String(err);
}
process.parentPort.postMessage({ kind: 'ready', at: Date.now(), pid: process.pid, node: process.versions.node, electronInUtility });
