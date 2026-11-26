// Drives the built spike in Chromium and prints what works and how fast. Run: node probe.mjs (after vite build).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
	const path = join('dist', req.url === '/' ? 'index.html' : req.url);
	try { const body = await readFile(path); res.writeHead(200, { 'content-type': types[extname(path)] ?? 'text/plain' }).end(body); }
	catch { res.writeHead(404).end(); }
}).listen(4999);

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const t0 = Date.now();
await page.goto('http://localhost:4999/');
await page.waitForSelector('[data-panel=chat]');
const report = { firstLayoutMs: Date.now() - t0 };
const stats = () => page.evaluate(() => ({ ...globalThis.__stats }));
const groups = () => page.evaluate(() => globalThis.__dock.groups.length);
const active = () => page.evaluate(() => globalThis.__dock.activePanel?.id);
const shot = (n) => page.screenshot({ path: `shots/${n}.png` });
await shot('1-default');
report.default = { groups: await groups(), stats: await stats() };
report.contextInPanel = await page.textContent('[data-panel=chat] .ctx');

// State in the chat panel.
await page.fill('[data-panel=chat] .text', 'hello');
await page.click('[data-panel=chat] .inc');
await page.click('[data-panel=chat] .inc');

// Rail toggle: open "usage" next to the active group, then tab it into chat's group by drag.
await page.click('[data-rail=usage]');
report.afterRailToggle = { groups: await groups(), panels: await page.evaluate(() => globalThis.__dock.panels.map((p) => p.id)) };

// Drag the usage tab onto the chat tab strip (HTML5 DnD) -> becomes a tab next to chat.
const dragTo = async (src, dst, dx = 0.5, dy = 0.5) => {
	const a = await page.locator(src).boundingBox();
	const b = await page.locator(dst).boundingBox();
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 5 });
	await page.mouse.move(b.x + b.width * dx, b.y + b.height * dy, { steps: 20 });
	await page.mouse.up();
	await page.waitForTimeout(100);
};
const tab = (id) => `.dv-tab:has(.tab):has-text("${id}")`;
const before = await stats();
await dragTo(tab('Usage'), '[data-panel=chat]', 0.5, 0.5);
report.dragTabIntoGroup = {
	groups: await groups(),
	usageGroupHasChat: await page.evaluate(() => globalThis.__dock.getPanel('usage').group.panels.map((p) => p.id)),
	remounted: (await stats()).mounts - before.mounts,
};
report.dragToTabStrip = await (async () => {
	await dragTo(tab('Usage'), tab('Chat 1'), 0.5, 0.5);
	return { groups: await groups(), usageGroup: await page.evaluate(() => globalThis.__dock.getPanel('usage').group.panels.map((p) => p.id)) };
})();
await shot('2-tabbed');

// Switch tabs back to chat: state kept?
await page.click(tab('Chat 1'));
report.stateAfterTabSwitch = {
	count: await page.textContent('[data-panel=chat] .count'),
	text: await page.inputValue('[data-panel=chat] .text'),
};

// Drag the terminal tab to the right edge of the chat content -> new split.
const b2 = await stats();
await dragTo(tab('Terminal'), '[data-panel=chat]', 0.95, 0.5);
report.dragToSplit = { groups: await groups(), remounted: (await stats()).mounts - b2.mounts };
await shot('3-split');

// Drag chat (with state) to the left edge of the editor -> moves group; is state kept?
await dragTo(tab('Chat 1'), '[data-panel=editor]', 0.05, 0.5);
report.dragChatMove = {
	groups: await groups(),
	count: await page.textContent('[data-panel=chat] .count'),
	text: await page.inputValue('[data-panel=chat] .text'),
	mounts: (await stats()).mounts,
};
await shot('4-moved');

// Resize via sash.
const sash = page.locator('.dv-sash').first();
const sb = await sash.boundingBox();
const w0 = await page.evaluate(() => globalThis.__dock.groups[0].width);
await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
await page.mouse.down();
await page.mouse.move(sb.x + 80, sb.y + sb.height / 2, { steps: 10 });
await page.mouse.up();
report.resize = { before: w0, after: await page.evaluate(() => globalThis.__dock.groups[0].width) };

// Keyboard: focus moves by direction, Alt+Shift moves the panel, Ctrl+W closes.
await page.evaluate(() => globalThis.__dock.getPanel('changes').api.setActive());
await page.locator('body').focus();
const keys = [];
for (const k of ['Alt+ArrowRight', 'Alt+ArrowRight', 'Alt+ArrowDown', 'Alt+ArrowLeft']) {
	await page.keyboard.press(k);
	keys.push(`${k} -> ${await active()}`);
}
report.keyboardFocus = keys;
await page.evaluate(() => globalThis.__dock.getPanel('editor').api.setActive());
const g0 = await groups();
await page.keyboard.press('Alt+Shift+ArrowRight');
report.keyboardMove = { groupsBefore: g0, groupsAfter: await groups(), editorGroup: await page.evaluate(() => globalThis.__dock.getPanel('editor').group.panels.map((p) => p.id)) };
await page.keyboard.press('Control+w');
report.ctrlW = { activeAfter: await active(), editorGone: await page.evaluate(() => !globalThis.__dock.getPanel('editor')) };
// Keys typed into a panel input stay there (no dockview key handling outside its tab list).
await page.click('[data-panel=chat] .text');
await page.keyboard.press('ArrowLeft');
report.inputKeepsArrows = await page.evaluate(() => document.activeElement?.className);
await shot('5-keyboard');

// Layout switching, the worktree-switch case. Layout A: default. Layout B: 8 panels in 5 groups.
report.layoutSwitch = await page.evaluate(async () => {
	const dock = globalThis.__dock;
	const L = globalThis.__layout;
	const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
	L.defaultLayout(dock);
	const A = dock.toJSON();
	dock.clear();
	const ids = ['changes', 'files', 'editor', 'review', 'chat', 'terminal', 'usage', 'workflows'];
	dock.addPanel({ id: 'files', component: 'files', title: 'Files' });
	dock.addPanel({ id: 'changes', component: 'changes', title: 'Changes', position: { referencePanel: 'files', direction: 'within' } });
	dock.addPanel({ id: 'editor', component: 'editor', title: 'tile-cache.ts', position: { referencePanel: 'files', direction: 'right' } });
	dock.addPanel({ id: 'review', component: 'review', title: 'Review', position: { referencePanel: 'editor', direction: 'within' } });
	dock.addPanel({ id: 'chat', component: 'chat', title: 'Chat 1', position: { referencePanel: 'editor', direction: 'right' } });
	dock.addPanel({ id: 'terminal', component: 'terminal', title: 'Terminal', position: { referencePanel: 'editor', direction: 'below' } });
	dock.addPanel({ id: 'usage', component: 'usage', title: 'Usage', position: { referencePanel: 'chat', direction: 'below' } });
	dock.addPanel({ id: 'workflows', component: 'workflows', title: 'Workflows', position: { referencePanel: 'terminal', direction: 'right' } });
	const B = dock.toJSON();
	const run = async (reuse) => {
		const times = [];
		const m0 = globalThis.__stats.mounts;
		for (let i = 0; i < 20; i++) {
			const t = performance.now();
			dock.fromJSON(i % 2 ? B : A, { reuseExistingPanels: reuse });
			const sync = performance.now() - t;
			await frame();
			times.push([sync, performance.now() - t]);
		}
		times.sort((x, y) => x[1] - y[1]);
		return {
			medianSyncMs: +times[10][0].toFixed(1),
			medianToFrameMs: +times[10][1].toFixed(1),
			maxToFrameMs: +times[19][1].toFixed(1),
			mountsPer20: globalThis.__stats.mounts - m0,
		};
	};
	return { panels: ids.length, jsonBytesA: JSON.stringify(A).length, jsonBytesB: JSON.stringify(B).length, fresh: await run(false), reuse: await run(true) };
});
await shot('6-layoutB');

// Does a rendered layout leave gaps between panels? Compare group boxes.
report.gaps = await page.evaluate(() => {
	const r = [...document.querySelectorAll('.dv-groupview')].map((e) => e.getBoundingClientRect());
	const grid = document.querySelector('.dv-dockview').getBoundingClientRect();
	const area = r.reduce((s, b) => s + b.width * b.height, 0);
	return { coverage: +(area / (grid.width * grid.height)).toFixed(4) };
});
report.errors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
server.close();
