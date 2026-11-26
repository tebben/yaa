// Deterministic VT workloads, written to corpus/<name>.bin. ~16 MiB each.
import fs from 'node:fs';
fs.mkdirSync('corpus', { recursive: true });
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const words = 'error warn info build compile test passed failed module import export const let function return async await promise resolve reject'.split(' ');
const TARGET = 16 * 1024 * 1024;
const gens = {
  plain: () => Array.from({ length: 6 + Math.floor(rnd() * 14) }, () => pick(words)).join(' ') + '\r\n',
  sgr: () => `\x1b[${pick([31,32,33,34,35,36,90])}m${pick(words)}\x1b[0m \x1b[1m${pick(words)}\x1b[22m ` + Array.from({ length: 8 }, () => `\x1b[3${Math.floor(rnd()*8)}m${pick(words)}`).join(' ') + '\x1b[0m\r\n',
  truecolor: () => Array.from({ length: 40 }, () => `\x1b[38;2;${Math.floor(rnd()*256)};${Math.floor(rnd()*256)};${Math.floor(rnd()*256)}m\x1b[48;2;${Math.floor(rnd()*64)};0;${Math.floor(rnd()*64)}m█`).join('') + '\x1b[0m\r\n',
  unicode: () => Array.from({ length: 12 }, () => pick(['日本語', '한국어', 'Ελληνικά', 'émoji 🎉', '👩‍💻', 'नमस्ते', 'مرحبا', '✓ ✗ ─│┌┐', 'ﬁ ligature', '🇳🇱'])).join(' ') + '\r\n',
  // full-screen TUI redraw: absolute cursor moves + styled cells, like htop/vim
  tui: () => { let s = '\x1b[?2026h\x1b[H'; for (let r = 1; r <= 40; r++) { s += `\x1b[${r};1H\x1b[${r % 2 ? 7 : 27}m`; for (let c = 0; c < 6; c++) s += `\x1b[3${(r + c) % 8}m${pick(words).padEnd(19)}`; } return s + '\x1b[0m\x1b[?2026l'; },
};
for (const [name, g] of Object.entries(gens)) {
  const parts = []; let n = 0;
  while (n < TARGET) { const p = g(); parts.push(p); n += Buffer.byteLength(p); }
  fs.writeFileSync(`corpus/${name}.bin`, parts.join(''));
}
const all = Object.keys(gens).map((n) => fs.readFileSync(`corpus/${n}.bin`).subarray(0, TARGET / 4));
fs.writeFileSync('corpus/mixed.bin', Buffer.concat(all));
console.log(fs.readdirSync('corpus').map((f) => `${f} ${(fs.statSync('corpus/' + f).size / 2 ** 20).toFixed(1)}MiB`).join(', '));
