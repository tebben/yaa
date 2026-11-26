import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => { const path = join('dist', req.url === '/' ? 'index.html' : req.url); try { const b = await readFile(path); res.writeHead(200, { 'content-type': types[extname(path)] ?? 'text/plain' }).end(b); } catch { res.writeHead(404).end(); } }).listen(4998);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4998/'); await page.waitForSelector('[data-panel=chat]');
const tab = (id) => `.dv-tab:has(.tab):has-text("${id}")`;
for (const [src, dst] of [['Terminal', 'chat'], ['Changes', 'editor']]) {
	const a = await page.locator(tab(src)).boundingBox(); const b = await page.locator(`[data-panel=${dst}]`).boundingBox();
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
	await page.mouse.move(a.x + 30, a.y + 30, { steps: 5 });
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 30 });
	await page.waitForTimeout(200);
	const overlay = await page.evaluate(() => [...document.querySelectorAll('.dv-drop-target-selection')].map((e) => e.getAttribute('class') + ' ' + JSON.stringify(e.getBoundingClientRect())));
	await page.mouse.up(); await page.waitForTimeout(100);
	console.log(src, '->', dst, 'overlay', overlay, 'group', await page.evaluate((d) => globalThis.__dock.getPanel(d).group.panels.map((p) => p.id), dst));
}
await page.screenshot({ path: 'shots/7-center.png' });
await browser.close(); server.close();
