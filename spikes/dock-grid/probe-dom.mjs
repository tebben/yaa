// Where do in-tree panel roots end up in dockview's DOM, and does a failing panel stay contained?
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => { const path = join('dist', req.url === '/' ? 'index.html' : req.url); try { const b = await readFile(path); res.writeHead(200, { 'content-type': types[extname(path)] ?? 'text/plain' }).end(b); } catch { res.writeHead(404).end(); } }).listen(4997);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4997/'); await page.waitForSelector('[data-panel=chat]');
const where = () => page.evaluate(() => [...document.querySelectorAll('.panel-root')].map((e) => {
	const r = e.getBoundingClientRect();
	return `${e.querySelector('[data-panel]')?.dataset.panel ?? e.textContent.slice(0, 40)} in .grid:${!!e.closest('.grid')} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
}));
console.log('initial', await where());
await page.click('[data-rail=workflows]');
await page.waitForTimeout(100);
console.log('after opening the failing panel', await where());
await page.click('[data-rail=workflows]');
await page.click('[data-rail=usage]');
await page.waitForTimeout(100);
console.log('after closing it and opening usage', await where());
console.log('errors', errors);
await page.screenshot({ path: 'shots/8-in-tree.png' });
await browser.close(); server.close();
