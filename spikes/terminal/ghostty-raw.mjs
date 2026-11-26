// Minimal binding to the official libghostty-vt 1.0 wasm C ABI. Works in Node and the browser.
export async function loadGhostty(bytes) {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const x = instance.exports, mem = x.memory;
  const p = x.ghostty_type_json();
  const u8 = new Uint8Array(mem.buffer);
  let end = p; while (u8[end]) end++;
  const types = JSON.parse(new TextDecoder().decode(u8.subarray(p, end)));
  const opt = types.types.GhosttyTerminalOption.values;
  return {
    types, exports: x,
    version: () => { const v = x.ghostty_version?.(); return v; },
    create(cols, rows, scrollbackLines) {
      const pp = x.ghostty_wasm_alloc_opaque();
      const r = x.ghostty_terminal_new(0, pp, cols, rows);
      if (r !== 0) throw new Error('terminal_new ' + r);
      const t = x.ghostty_wasm_take_opaque(pp); x.ghostty_wasm_free_opaque(pp);
      if (scrollbackLines != null) {
        // The byte limit defaults to 10,000 bytes (one page); lift it so the line limit applies.
        const v = x.ghostty_wasm_alloc(4), dv = new DataView(mem.buffer);
        dv.setUint32(v, 0xffffffff, true);
        if (x.ghostty_terminal_set(t, opt.SCROLLBACK_MAX_BYTES, v) !== 0) throw new Error('set bytes');
        dv.setUint32(v, scrollbackLines, true);
        if (x.ghostty_terminal_set(t, opt.SCROLLBACK_MAX_LINES, v) !== 0) throw new Error('set lines');
        x.ghostty_wasm_free(v, 4);
      }
      let cap = 0, buf = 0;
      return {
        handle: t,
        write(b) {
          if (b.length > cap) { if (buf) x.ghostty_wasm_free(buf, cap); cap = b.length; buf = x.ghostty_wasm_alloc(cap); }
          new Uint8Array(mem.buffer, buf, b.length).set(b);
          x.ghostty_terminal_vt_write(t, buf, b.length);
        },
        dispose() { if (buf) x.ghostty_wasm_free(buf, cap); x.ghostty_terminal_free(t); },
      };
    },
  };
}
