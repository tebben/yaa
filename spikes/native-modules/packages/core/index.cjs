'use strict';
// Probes for the native-modules spike: node:sqlite, better-sqlite3, node-pty.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROWS = 100_000;

function bench(name, open) {
  const file = path.join(os.tmpdir(), `spike-${name}-${process.pid}-${Date.now()}.db`);
  const r = { ok: false };
  try {
    const t0 = performance.now();
    const { db, run, all, close, version } = open(file);
    r.version = version;
    run('PRAGMA journal_mode = WAL');
    run('PRAGMA synchronous = NORMAL');
    run('CREATE TABLE events (id INTEGER PRIMARY KEY, worktree TEXT, kind TEXT, at INTEGER, payload TEXT)');
    r.openMs = +(performance.now() - t0).toFixed(1);
    const t1 = performance.now();
    db.insertMany(ROWS);
    r.insertMsPer100k = +(performance.now() - t1).toFixed(1);
    const t2 = performance.now();
    const rows = all("SELECT worktree, count(*) AS n FROM events WHERE kind = 'turn' GROUP BY worktree");
    r.groupByMs = +(performance.now() - t2).toFixed(1);
    r.groups = rows.length;
    close();
    r.ok = true;
  } catch (e) {
    r.error = String(e && e.stack || e);
  } finally {
    for (const s of ['', '-wal', '-shm']) fs.rmSync(file + s, { force: true });
  }
  return r;
}

const payload = JSON.stringify({ text: 'x'.repeat(200) });

function nodeSqlite() {
  let mod;
  try { mod = require('node:sqlite'); } catch (e) { return { ok: false, available: false, error: String(e.message) }; }
  return { available: true, ...bench('node', (file) => {
    const db = new mod.DatabaseSync(file);
    const ins = () => db.prepare('INSERT INTO events (worktree, kind, at, payload) VALUES (?, ?, ?, ?)');
    return {
      version: db.prepare('select sqlite_version() v').get().v,
      run: (s) => db.exec(s),
      all: (s) => db.prepare(s).all(),
      close: () => db.close(),
      db: { insertMany(n) { const st = ins(); db.exec('BEGIN'); for (let i = 0; i < n; i++) st.run(`wt${i % 20}`, i % 3 ? 'turn' : 'tool', i, payload); db.exec('COMMIT'); } },
    };
  }) };
}

function betterSqlite() {
  let Database;
  try { Database = require('better-sqlite3'); } catch (e) { return { ok: false, available: false, error: String(e.stack) }; }
  return { available: true, ...bench('better', (file) => {
    const db = new Database(file);
    return {
      version: db.prepare('select sqlite_version() v').get().v,
      run: (s) => db.exec(s),
      all: (s) => db.prepare(s).all(),
      close: () => db.close(),
      db: { insertMany(n) { const st = db.prepare('INSERT INTO events (worktree, kind, at, payload) VALUES (?, ?, ?, ?)'); db.transaction(() => { for (let i = 0; i < n; i++) st.run(`wt${i % 20}`, i % 3 ? 'turn' : 'tool', i, payload); })(); } },
    };
  }) };
}

function pty() {
  return new Promise((resolve) => {
    let mod;
    try { mod = require('node-pty'); } catch (e) { resolve({ ok: false, error: String(e.stack) }); return; }
    const t0 = performance.now();
    const p = mod.spawn('/bin/sh', ['-c', 'printf "cols=%s\\n" "$(tput cols 2>/dev/null || stty size)"; tty'], { cols: 91, rows: 30, env: process.env });
    let out = '';
    p.onData((d) => { out += d; });
    p.onExit(({ exitCode }) => resolve({ ok: exitCode === 0 && /\/dev\/pts\//.test(out), exitCode, spawnToExitMs: +(performance.now() - t0).toFixed(1), out: out.trim() }));
  });
}

async function probeAll() {
  return {
    versions: { node: process.versions.node, electron: process.versions.electron, modules: process.versions.modules, napi: process.versions.napi, sqlite: process.versions.sqlite },
    nodeSqlite: nodeSqlite(),
    betterSqlite: betterSqlite(),
    pty: await pty(),
  };
}

module.exports = { probeAll };
