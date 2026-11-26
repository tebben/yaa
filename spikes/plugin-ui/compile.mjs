// The plugin UI build: esbuild plus the Svelte compiler, the same in dev
// (watch) and for prebuilt plugins. Shared specifiers become reads from the
// app's registry, so a plugin never carries its own Svelte runtime.
import * as esbuild from 'esbuild';
import { compile, compileModule, VERSION } from 'svelte/compiler';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SHARED = /^(svelte(\/.*)?|@yaa\/ui)$/;

const sharedPlugin = {
  name: 'yaa-shared',
  setup(b) {
    b.onResolve({ filter: SHARED }, (a) => ({ path: a.path, namespace: 'yaa-shared' }));
    b.onLoad({ filter: /.*/, namespace: 'yaa-shared' }, (a) => ({
      contents: `const m = globalThis.__yaaShared?.[${JSON.stringify(a.path)}];
if (!m) throw new Error(${JSON.stringify(`yaa: '${a.path}' is not shared with plugins`)});
module.exports = m;`,
      loader: 'js',
    }));
  },
};

const sveltePlugin = {
  name: 'svelte',
  setup(b) {
    const css = new Map();
    b.onLoad({ filter: /\.svelte$/ }, async (a) => {
      const source = await readFile(a.path, 'utf8');
      const r = compile(source, { filename: a.path, generate: 'client', css: 'external', runes: true, discloseVersion: false });
      let code = r.js.code;
      if (r.css?.code) {
        const id = `${a.path}.css`;
        css.set(id, r.css.code);
        code += `\nimport ${JSON.stringify(id)};`;
      }
      return { contents: code, loader: 'js', warnings: r.warnings.map((w) => ({ text: w.message })) };
    });
    b.onResolve({ filter: /\.svelte\.css$/ }, (a) => ({ path: a.path, namespace: 'svelte-css' }));
    b.onLoad({ filter: /.*/, namespace: 'svelte-css' }, (a) => ({ contents: css.get(a.path), loader: 'css' }));
    b.onLoad({ filter: /\.svelte\.ts$/ }, async (a) => {
      const ts = await readFile(a.path, 'utf8');
      const { code: js } = await esbuild.transform(ts, { loader: 'ts' });
      const r = compileModule(js, { filename: a.path, generate: 'client' });
      return { contents: r.js.code, loader: 'js' };
    });
  },
};

export function options(dir) {
  return {
    entryPoints: { ui: path.join(dir, 'src/ui.ts') },
    outdir: path.join(dir, 'dist'),
    bundle: true,
    format: 'esm',
    target: 'chrome140',
    resolveExtensions: ['.svelte.ts', '.ts', '.js', '.svelte'],
    plugins: [sharedPlugin, sveltePlugin],
    banner: { js: `/* built with svelte ${VERSION} */` },
    logLevel: 'silent',
    metafile: true,
  };
}

export const svelteVersion = VERSION;

if (process.argv[2]) {
  const t0 = performance.now();
  const r = await esbuild.build(options(path.resolve(process.argv[2])));
  console.log(JSON.stringify({ ms: Math.round(performance.now() - t0), outputs: Object.fromEntries(Object.entries(r.metafile.outputs).map(([k, v]) => [k, v.bytes])) }));
}
