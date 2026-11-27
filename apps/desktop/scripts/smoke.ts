// The smoke test: runs the built app in dev mode, with a fresh data folder,
// and drives its window over the DevTools protocol. The app starts with a
// project (added beforehand: the system's folder picker cannot be driven),
// its overview opens, search finds it, its main checkout opens, a worktree
// is created and finished, the panel bar opens the files panel at the right edge,
// which filters on /, follows the folder and makes and deletes a file, a file
// opens from it in the editor, is edited and saved with vim keys, and another
// by quick open, a command runs in the terminal, which keeps Ctrl W and is
// still there after a reload, the palette runs the hello plugin's command, and
// the fake agent plays a turn into the chat panel, with the worktree's state
// following it, then a turn of markdown picked as a slash command, whose file
// link opens the editor. A restart brings the editor's tabs back and opens the
// terminal where it was. It prints the launch and palette
// open times against the targets in docs/spec/12-stack-packaging.md and fails
// only when a step fails
// (docs/decisions/0022-smoke-test.md). Run `pnpm run smoke`, which builds first.
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { appOrigin } from "@yaa/contracts/app-urls";
import { createGitService } from "@yaa/core/git";
import { createProjects } from "@yaa/core/projects";
import { openDatabase } from "@yaa/core/storage";
import { z } from "zod";
import { outDir } from "./bundle.ts";
import { type Connection, connect, evaluate } from "./cdp.ts";

const LAUNCH_TARGET_MS = 1500;
const PALETTE_TARGET_MS = 50;
const WARM_LAUNCHES = 3;
const PALETTE_OPENS = 5;
const STEP_TIMEOUT_MS = 15_000;
// Longer than a step, whose own deadline runs in the page.
const COMMAND_TIMEOUT_MS = 20_000;

type App = {
	child: ChildProcess;
	page: Connection;
	browser: Connection;
	launchMs: number;
};

const target = z.object({
	type: z.string(),
	url: z.string(),
	webSocketDebuggerUrl: z.string(),
});

// Polls until `find` returns a value; the window and its DevTools endpoint
// take a moment to appear.
const poll = async <T>(
	what: string,
	find: () => Promise<T | undefined>,
): Promise<T> => {
	const end = Date.now() + STEP_TIMEOUT_MS;
	while (Date.now() < end) {
		const found = await find().catch(() => undefined);
		if (found !== undefined) return found;
		await delay(50);
	}
	throw new Error(`Timed out waiting for ${what}`);
};

// Chromium writes the port it picked, and the browser's path, here.
const devToolsEndpoint = async (dataDir: string) => {
	const [port, path] = (
		await readFile(join(dataDir, "DevToolsActivePort"), "utf8")
	).split("\n");
	return port && path ? { port, path } : undefined;
};

// The app that is running, stopped if a step fails.
let running: ChildProcess | undefined;

const launch = async (dataDir: string): Promise<App> => {
	await rm(join(dataDir, "DevToolsActivePort"), { force: true });
	const launchedAt = Date.now();
	const child = spawn(
		"electron",
		[
			join(outDir, "main.js"),
			`--user-data-dir=${dataDir}`,
			"--remote-debugging-port=0",
		],
		// Dev mode echoes every log line; the log file is printed on failure.
		{
			stdio: ["ignore", "ignore", "inherit"],
			env: { ...process.env, YAA_DEV: "1" },
		},
	);
	running = child;
	const { port, path } = await poll("the DevTools port", () =>
		devToolsEndpoint(dataDir),
	);
	const browser = await connect(
		`ws://127.0.0.1:${port}${path}`,
		COMMAND_TIMEOUT_MS,
	);
	const pageUrl = await poll("the window", async () => {
		const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
			signal: AbortSignal.timeout(COMMAND_TIMEOUT_MS),
		});
		const targets = z.array(target).parse(await response.json());
		// The window shows about:blank until it navigates to the app, which
		// would destroy anything evaluated before.
		return targets.find(
			({ type, url }) => type === "page" && url.startsWith(appOrigin),
		)?.webSocketDebuggerUrl;
	});
	const page = await connect(pageUrl, COMMAND_TIMEOUT_MS);
	// The mark App sets once the dock is on screen, in epoch milliseconds.
	// Polled from here: the mark keeps its time, and the page's first
	// document may still be replaced by the app's.
	const interactiveAt = await poll("the dock", () =>
		evaluate(
			page,
			`(() => {
				const [mark] = performance.getEntriesByName("yaa:interactive");
				return mark && performance.timeOrigin + mark.startTime;
			})()`,
			z.number().optional(),
		),
	);
	return { child, page, browser, launchMs: interactiveAt - launchedAt };
};

// Closing the browser quits the app as closing its window does. The reply
// may never come, as the connection goes with the browser; the exit counts.
const quit = async ({ child, page, browser }: App) => {
	const exited = once(child, "exit", {
		signal: AbortSignal.timeout(COMMAND_TIMEOUT_MS),
	});
	page.close();
	browser.send("Browser.close").catch(() => undefined);
	await exited;
	browser.close();
	running = undefined;
};

// An expression that resolves to the condition's value once it is truthy,
// checked every frame, or rejects after the step timeout.
const until = (condition: string) => `new Promise((resolve, reject) => {
	const end = performance.now() + ${STEP_TIMEOUT_MS};
	const check = () => {
		const value = ${condition};
		if (value) resolve(value);
		else if (performance.now() > end) reject(new Error(${JSON.stringify(`Timed out waiting for ${condition}`)}));
		else requestAnimationFrame(check);
	};
	check();
})`;

const buttonNamed = (name: string) =>
	`[...document.querySelectorAll("button")].find((button) => button.textContent.trim() === ${JSON.stringify(name)})`;

const PALETTE = `document.querySelector('[aria-label="Command palette"]')`;

const waitFor = (page: Connection, condition: string) =>
	evaluate(page, until(`Boolean(${condition})`), z.literal(true));

const click = async (page: Connection, name: string) => {
	await waitFor(page, buttonNamed(name));
	await evaluate(page, `${buttonNamed(name)}.click()`, z.undefined());
};

// A key as CDP sends it. A key with text, such as Enter, also types it,
// which is what submits a form.
type Key = {
	key: string;
	code: string;
	keyCode: number;
	modifiers?: number;
	text?: string;
};
const CTRL_SHIFT = 2 | 8;
const OPEN_PALETTE: Key = {
	key: "P",
	code: "KeyP",
	keyCode: 80,
	modifiers: CTRL_SHIFT,
};
const ESCAPE: Key = { key: "Escape", code: "Escape", keyCode: 27 };
const SLASH: Key = { key: "/", code: "Slash", keyCode: 191, text: "/" };
const ENTER: Key = { key: "Enter", code: "Enter", keyCode: 13, text: "\r" };
const NEW_WORKTREE: Key = {
	key: "N",
	code: "KeyN",
	keyCode: 78,
	modifiers: CTRL_SHIFT,
};

const press = async (
	page: Connection,
	{ key, code, keyCode, modifiers = 0, text }: Key,
) => {
	const event = { key, code, windowsVirtualKeyCode: keyCode, modifiers };
	await page.send(
		"Input.dispatchKeyEvent",
		text === undefined
			? { type: "rawKeyDown", ...event }
			: { type: "keyDown", text, ...event },
	);
	await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
};

const type = (page: Connection, text: string) =>
	page.send("Input.insertText", { text });

const clickElement = async (page: Connection, element: string) => {
	await waitFor(page, element);
	const { x, y } = await evaluate(
		page,
		`(() => {
			const rect = (${element}).getBoundingClientRect();
			return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		})()`,
		z.object({ x: z.number(), y: z.number() }),
	);
	await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
	await page.send("Input.dispatchMouseEvent", {
		type: "mousePressed",
		x,
		y,
		button: "left",
		clickCount: 1,
	});
	await page.send("Input.dispatchMouseEvent", {
		type: "mouseReleased",
		x,
		y,
		button: "left",
		clickCount: 1,
	});
};

// The open worktree's dock; the docks of other worktrees stay, hidden.
const DOCK = `[...document.querySelectorAll(".yaa-dock")].find((dock) => dock.offsetParent !== null)`;

const checkPanelBarPlacement = async (page: Connection) => {
	const changes = `[...(${DOCK}).querySelectorAll(".dv-tab")].find((tab) => tab.textContent.trim() === "Changes")`;
	const files = `document.querySelector('[aria-label="Panels"] button[aria-label="Files"]')`;
	const filesTab = `[...(${DOCK}).querySelectorAll(".dv-tab")].find((tab) => tab.textContent.trim() === "Files")`;
	await clickElement(page, changes);
	await clickElement(page, files);
	await waitFor(page, filesTab);
	await waitFor(
		page,
		`(() => {
			const panel = (${filesTab}).closest(".dv-groupview").getBoundingClientRect();
			const grid = (${DOCK}).getBoundingClientRect();
			return Math.abs(panel.right - grid.right) < 1 &&
				Math.abs(panel.top - grid.top) < 1 &&
				Math.abs(panel.bottom - grid.bottom) < 1;
		})()`,
	);
};

const PANEL_GAP = `document.querySelector('input[aria-label="Panel spacing"]')`;

// The settings screen: a change applies to the page and lands in
// settings.json, and a reset takes it out again.
const useSettings = async (page: Connection, dataDir: string) => {
	const settingsFile = join(dataDir, "settings.json");
	const gap = (value: string) =>
		`getComputedStyle(document.documentElement).getPropertyValue("--spacing-panel-gap") === "${value}"`;
	await clickElement(
		page,
		`document.querySelector('button[aria-label="Settings"]')`,
	);
	await clickElement(
		page,
		`(${PANEL_GAP}).closest("label").nextElementSibling`,
	);
	await waitFor(page, gap("10px"));
	if (
		!(await readFile(settingsFile, "utf8")).includes(
			'"appearance.panelGap": 10',
		)
	) {
		throw new Error("The panel spacing did not reach settings.json");
	}
	await clickElement(
		page,
		`[...document.querySelectorAll('button[aria-label="Reset to default"]')].find((button) => !button.closest(".invisible"))`,
	);
	await waitFor(page, gap("8px"));
	if ((await readFile(settingsFile, "utf8")).includes("appearance.panelGap")) {
		throw new Error("Resetting the panel spacing left it in settings.json");
	}
	await clickElement(
		page,
		`[...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Back to app")`,
	);
	await waitFor(page, `!(${PANEL_GAP}) && (${DOCK})`);
};

const NEW_FILE: Key = { key: "n", code: "KeyN", keyCode: 78, text: "n" };
const DELETE_FILE: Key = { key: "d", code: "KeyD", keyCode: 68, text: "d" };

const fileRow = (path: string) =>
	`(${DOCK}).querySelector('[aria-label="Files"] button[title="${path}"]')`;

// In the files panel the panel bar opened: a file made outside the app appears,
// and one is created and deleted by keys.
const useFilesPanel = async (page: Connection, repo: string) => {
	await waitFor(page, `(${DOCK}).querySelector('[aria-label="Files"]')`);
	await writeFile(join(repo, "outside.txt"), "");
	await clickElement(page, fileRow("outside.txt"));
	await press(page, SLASH);
	await waitFor(
		page,
		`document.activeElement?.getAttribute("aria-label") === "Filter files"`,
	);
	await press(page, ESCAPE);
	await clickElement(page, fileRow("outside.txt"));
	await press(page, NEW_FILE);
	await waitFor(
		page,
		`document.activeElement?.getAttribute("aria-label") === "New file path"`,
	);
	await type(page, "made/by-keys.txt");
	await press(page, ENTER);
	await waitFor(
		page,
		`document.activeElement === ${fileRow("made/by-keys.txt")}`,
	);
	const made = join(repo, "made", "by-keys.txt");
	await access(made);
	await press(page, DELETE_FILE);
	await waitFor(
		page,
		`document.activeElement?.textContent.trim() === "Delete"`,
	);
	await press(page, ENTER);
	await waitFor(page, `!${fileRow("made/by-keys.txt")}`);
	await access(made).then(
		() => {
			throw new Error(`${made} is still there after deleting`);
		},
		() => undefined,
	);
};

const CTRL = 2;
const QUICK_OPEN: Key = {
	key: "p",
	code: "KeyP",
	keyCode: 80,
	modifiers: CTRL,
};

const editorTab = (path: string) =>
	`(${DOCK}).querySelector('[role="tab"][title="${path}"]')`;

const editorShows = (text: string) =>
	`(${DOCK}).querySelector(".monaco-editor .view-lines")?.textContent.includes(${JSON.stringify(text)})`;

const VIM_INSERT: Key = { key: "i", code: "KeyI", keyCode: 73, text: "i" };
const VIM_COMMAND: Key = {
	key: ":",
	code: "Semicolon",
	keyCode: 186,
	modifiers: 8,
	text: ":",
};
const VIM_PROMPT = `document.activeElement?.closest(".vim")`;

// A click in the files panel previews a file; Enter moves into the editor,
// where / searches in the file and vim keys type into it and save it; quick
// open opens another.
const useEditor = async (page: Connection, repo: string) => {
	const first = join(repo, "first.ts");
	await writeFile(first, "export const first = 1;\n");
	await writeFile(join(repo, "second.ts"), "export const second = 2;\n");
	await clickElement(page, fileRow("first.ts"));
	await waitFor(page, editorShows("first"));
	await waitFor(page, `document.activeElement === ${fileRow("first.ts")}`);
	await press(page, ENTER);
	await waitFor(page, `document.activeElement?.closest(".monaco-editor")`);
	await press(page, SLASH);
	await waitFor(page, VIM_PROMPT);
	await press(page, ESCAPE);
	await waitFor(page, `document.activeElement?.closest(".monaco-editor")`);
	await press(page, VIM_INSERT);
	await type(page, "typed");
	await press(page, ESCAPE);
	await press(page, VIM_COMMAND);
	await waitFor(page, VIM_PROMPT);
	await type(page, "w");
	await press(page, ENTER);
	await poll("the saved file", async () =>
		(await readFile(first, "utf8")).startsWith("typedexport")
			? true
			: undefined,
	);
	await press(page, QUICK_OPEN);
	await waitFor(
		page,
		`document.querySelector('[role="dialog"][aria-label="Go to file"]')`,
	);
	await type(page, "second");
	await waitFor(
		page,
		`document.querySelector('[role="option"]')?.textContent.includes("second.ts")`,
	);
	await press(page, ENTER);
	await waitFor(page, editorShows("second"));
	await waitFor(page, editorTab("first.ts"));
};

// Optional, as after a reload no dock is there for a moment.
const TERMINAL_INPUT = `(${DOCK})?.querySelector(".xterm textarea")`;
const CLOSE_WORD: Key = {
	key: "w",
	code: "KeyW",
	keyCode: 87,
	modifiers: CTRL,
};

// Types a command into the terminal and waits for what it writes to `file`.
const runInTerminal = async (
	page: Connection,
	command: string,
	file: string,
	expected: string,
) => {
	await waitFor(page, TERMINAL_INPUT);
	await evaluate(page, `${TERMINAL_INPUT}.focus()`, z.undefined());
	await type(page, `${command} > '${file}'`);
	await press(page, ENTER);
	await poll(`${file} to read ${JSON.stringify(expected)}`, async () =>
		(await readFile(file, "utf8")) === expected ? true : undefined,
	);
};

// The terminal's shell runs in the worktree with its index, gets Ctrl W,
// which deletes a word, and is the same one after the page reloads.
const useTerminal = async (page: Connection, dataDir: string) => {
	const out = (name: string) => join(dataDir, `terminal-${name}`);
	await runInTerminal(page, 'echo "$YAA_WORKTREE_INDEX"', out("index"), "0\n");
	await type(page, "echo kept dropped");
	await press(page, CLOSE_WORD);
	await type(page, `> '${out("word")}'`);
	await press(page, ENTER);
	await poll("the word Ctrl W deleted to be gone", async () =>
		(await readFile(out("word"), "utf8")) === "kept\n" ? true : undefined,
	);
	await runInTerminal(
		page,
		'mkdir inner && cd inner && export SMOKE=same && basename "$PWD"',
		out("cd"),
		"inner\n",
	);
	await evaluate(page, "void (globalThis.reloading = true)", z.undefined());
	await page.send("Page.reload");
	await poll("the reloaded page", async () =>
		(await evaluate(page, "!globalThis.reloading", z.boolean()))
			? true
			: undefined,
	);
	await runInTerminal(page, 'echo "$SMOKE"', out("same"), "same\n");
};

// A repository with one commit on main, added as a project to the data
// folder the app is about to use, whose worktrees go into the data folder.
// Its steps copy an ignored file into a new worktree, write the worktree's
// index beside it, and copy that out again on teardown.
const addRepo = async (dataDir: string, dir: string) => {
	await writeFile(
		join(dataDir, "settings.json"),
		JSON.stringify({ "worktree.directory": join(dataDir, "worktrees") }),
	);
	await mkdir(dir);
	const git = (...args: string[]) =>
		execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
	git("init", "--initial-branch=main");
	git(
		"-c",
		"user.name=yaa",
		"-c",
		"user.email=yaa@localhost",
		"commit",
		"--allow-empty",
		"--message=start",
	);
	await writeFile(join(dir, ".git", "info", "exclude"), ".env*\n.yaa\n");
	await writeFile(join(dir, ".env"), "SMOKE=1\n");
	await mkdir(join(dir, ".yaa"));
	await writeFile(
		join(dir, ".yaa", "worktree.json"),
		JSON.stringify({
			copy: [".env"],
			setup: [
				'cat .env > .env.setup && echo "$YAA_WORKTREE_INDEX" >> .env.setup',
			],
			teardown: [`cp .env.setup '${join(dataDir, "teardown")}'`],
		}),
	);
	const db = openDatabase(join(dataDir, "yaa.db"));
	const projects = createProjects({
		db,
		git: createGitService(),
		home: homedir(),
	});
	const added = await projects.add(dir);
	db.close();
	if ("problem" in added) throw new Error(added.problem);
};

const MENU = `document.querySelector('nav[aria-label="Projects"]')`;
const SEARCH = `document.querySelector('input[aria-label="Search projects"]')`;

const menuButton = (text: string) =>
	`[...${MENU}.querySelectorAll("button")].find((button) => button.textContent.includes(${JSON.stringify(text)}))`;

// Opens the project's overview, searches the tree, and opens the main
// checkout, which shows the dock.
const openProject = async (page: Connection) => {
	await clickElement(page, menuButton("repo"));
	await waitFor(
		page,
		`document.querySelector('[aria-label="Project overview"]')`,
	);
	await press(page, SLASH);
	await waitFor(page, `document.activeElement === ${SEARCH}`);
	await type(page, "zzz");
	await waitFor(page, `${MENU}.textContent.includes("Nothing matches")`);
	await press(page, ESCAPE);
	await waitFor(page, `${SEARCH}.value === ""`);
	await clickElement(page, menuButton("main"));
	await waitFor(page, `document.querySelector('[aria-label="Panels"]')`);
};

const HEADER = `document.querySelector("header")`;

// Creates a worktree from the palette, which opens its grid, then finishes
// it, removing its folder and branch, which opens the main checkout again.
const createAndFinishWorktree = async (page: Connection, dataDir: string) => {
	await press(page, NEW_WORKTREE);
	await waitFor(
		page,
		`document.querySelector('[role="dialog"][aria-label="New worktree"]')`,
	);
	await type(page, "1 smoke");
	await waitFor(
		page,
		`document.querySelector('[role="option"]')?.textContent.includes("1-smoke")`,
	);
	await press(page, ENTER);
	await waitFor(page, `${HEADER}.textContent.includes("1-smoke")`);
	const folder = join(dataDir, "worktrees", "repo", "1-smoke");
	await poll("the worktree's setup", async () =>
		(await readFile(join(folder, ".env.setup"), "utf8").catch(() => "")) ===
		"SMOKE=1\n1\n"
			? true
			: undefined,
	);
	const finish = async () => {
		await press(page, OPEN_PALETTE);
		await waitFor(page, PALETTE);
		await type(page, "Finish worktree");
		await press(page, ENTER);
		await waitFor(
			page,
			`document.querySelector('[role="dialog"][aria-label="Finish 1-smoke"]')`,
		);
	};
	// Settled, it folds away under the project and reopens from the palette.
	await finish();
	await type(page, "Settle");
	await press(page, ENTER);
	await waitFor(
		page,
		`${HEADER}.textContent.includes("main") && ${MENU}.textContent.includes("Settled") && !${MENU}.textContent.includes("1-smoke")`,
	);
	await press(page, OPEN_PALETTE);
	await waitFor(page, PALETTE);
	await type(page, "Reopen settled worktree");
	await press(page, ENTER);
	await waitFor(
		page,
		`document.querySelector('[role="option"]')?.textContent.includes("1-smoke")`,
	);
	await press(page, ENTER);
	await waitFor(page, `${HEADER}.textContent.includes("1-smoke")`);
	await finish();
	await press(page, ENTER);
	await waitFor(
		page,
		`${HEADER}.textContent.includes("main") && !${MENU}.textContent.includes("1-smoke")`,
	);
	await access(join(dataDir, "teardown"));
	await access(folder).then(
		() => {
			throw new Error(`${folder} is still there after finishing`);
		},
		() => undefined,
	);
};

// From the key's event to the frame after the palette is in the DOM, so
// its paint is included. The listeners go in before the key is sent: input
// reaches the page through the browser process, so it can overtake an
// expression still being evaluated.
const paletteOpenMs = async (page: Connection): Promise<number> => {
	await evaluate(
		page,
		`void (globalThis.paletteOpened = new Promise((resolve) => {
			let pressedAt;
			addEventListener("keydown", (event) => { pressedAt = event.timeStamp; }, { capture: true, once: true });
			const observer = new MutationObserver(() => {
				if (!${PALETTE}) return;
				observer.disconnect();
				requestAnimationFrame(() => setTimeout(() => resolve(performance.now() - pressedAt)));
			});
			observer.observe(document.body, { childList: true, subtree: true });
		}))`,
		z.undefined(),
	);
	await press(page, OPEN_PALETTE);
	const ms = await evaluate(page, "globalThis.paletteOpened", z.number());
	await press(page, ESCAPE);
	await waitFor(page, `!${PALETTE}`);
	return ms;
};

const runPluginCommand = async (page: Connection, logFile: string) => {
	await press(page, OPEN_PALETTE);
	await waitFor(page, PALETTE);
	await type(page, "Say hello");
	await press(page, ENTER);
	await waitFor(page, `!${PALETTE}`);
	await poll("the hello plugin's log line", async () =>
		(await readFile(logFile, "utf8")).includes("Hello from the hello plugin")
			? true
			: undefined,
	);
};

const FOOTER = `document.querySelector("footer")`;
const ALT = 1;
const NEXT_ATTENTION: Key = {
	key: "a",
	code: "KeyA",
	keyCode: 65,
	modifiers: ALT,
};

const CHAT = `(${DOCK}).querySelector('textarea[aria-label="Prompt"]')`;

// The edit turn asks for a permission and a question; answering both lets
// it end. While it waits, the worktree needs attention, and a key leads back
// to it from the project's overview.
const playFakeTurn = async (page: Connection) => {
	await click(page, "Start Fake agent");
	await waitFor(page, `document.activeElement === ${CHAT}`);
	await type(page, "Make the greeting friendlier");
	await press(page, ENTER);
	await waitFor(page, `${FOOTER}.textContent.includes("Needs attention")`);
	await clickElement(page, menuButton("repo"));
	await waitFor(page, `!${FOOTER}.textContent.includes("Needs attention")`);
	await press(page, NEXT_ATTENTION);
	await waitFor(page, `${FOOTER}.textContent.includes("Needs attention")`);
	await click(page, "Allow");
	await click(page, "Decline");
	await waitFor(
		page,
		`(${DOCK}).textContent.includes("The greeting now says")`,
	);
	await waitFor(page, `${FOOTER}.textContent.includes("Idle")`);
};

// A slash command is picked by keys; its reply's code is highlighted, and a
// file it names opens in the editor.
const readMarkdownTurn = async (page: Connection, repo: string) => {
	await mkdir(join(repo, "src"), { recursive: true });
	await writeFile(join(repo, "src", "greeting.ts"), "export const hi = 3;\n");
	await clickElement(page, CHAT);
	await type(page, "/mark");
	await waitFor(page, `(${DOCK}).querySelector('[role="option"]')`);
	await press(page, ENTER);
	await waitFor(page, `${CHAT}.value === "/markdown "`);
	await press(page, ENTER);
	await waitFor(page, `(${DOCK}).querySelector("pre code span[style]")`);
	await click(page, "src/greeting.ts:1");
	await waitFor(page, editorShows("hi"));
	await waitFor(page, `${FOOTER}.textContent.includes("Idle")`);
};

// After a restart the chat is back with its transcript, and its next prompt
// starts the agent again and resumes the session.
const resumeChat = async (page: Connection) => {
	await waitFor(
		page,
		`(${DOCK}).textContent.includes("The greeting now says")`,
	);
	await clickElement(page, CHAT);
	await type(page, "/mark");
	await waitFor(page, `(${DOCK}).querySelector('[role="option"]')`);
	await press(page, ENTER);
	await waitFor(page, `${CHAT}.value === "/markdown "`);
	await press(page, ENTER);
	await waitFor(page, `(${DOCK}).textContent.includes("Agent started again")`);
	await waitFor(page, `(${DOCK}).querySelector("pre code span[style]")`);
	await waitFor(page, `${FOOTER}.textContent.includes("Idle")`);
};

const median = (values: readonly number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
};

const report = (name: string, ms: number, targetMs: number) =>
	console.log(
		`${name}: ${Math.round(ms)} ms (target ${targetMs} ms${ms > targetMs ? ", over" : ""})`,
	);

const dataDir = await mkdtemp(join(tmpdir(), "yaa-smoke-"));
const logFile = join(dataDir, "logs", "yaa.log");
try {
	await addRepo(dataDir, join(dataDir, "repo"));
	const first = await launch(dataDir);
	console.log("The app started.");
	await openProject(first.page);
	console.log("The project's overview, search and main checkout opened.");
	await createAndFinishWorktree(first.page, dataDir);
	console.log(
		"A worktree was created, set up, settled, reopened, torn down and finished.",
	);
	await checkPanelBarPlacement(first.page);
	console.log("The panel bar opened a panel at the right edge.");
	await useSettings(first.page, dataDir);
	console.log("A setting changed the page and settings.json, and reset.");
	await useFilesPanel(first.page, join(dataDir, "repo"));
	console.log("The files panel followed the folder, made and deleted a file.");
	await useEditor(first.page, join(dataDir, "repo"));
	console.log("The editor opened, saved and quick-opened files.");
	await useTerminal(first.page, dataDir);
	console.log("The terminal ran commands and came back after a reload.");
	await runPluginCommand(first.page, logFile);
	console.log("The palette ran the hello plugin's command.");
	await playFakeTurn(first.page);
	console.log("The fake agent's turn played to its end.");
	await readMarkdownTurn(first.page, join(dataDir, "repo"));
	console.log("A slash command's markdown reply opened a file.");
	const paletteTimes: number[] = [];
	for (let run = 0; run < PALETTE_OPENS; run += 1) {
		paletteTimes.push(await paletteOpenMs(first.page));
	}
	console.log("The palette opened and closed.");
	await quit(first);

	const warmTimes: number[] = [];
	for (let run = 0; run < WARM_LAUNCHES; run += 1) {
		const app = await launch(dataDir);
		warmTimes.push(app.launchMs);
		await waitFor(app.page, editorTab("first.ts"));
		await waitFor(app.page, editorShows("hi"));
		await runInTerminal(
			app.page,
			'basename "$PWD"',
			join(dataDir, `terminal-restart-${run}`),
			"inner\n",
		);
		if (run === 0) {
			await resumeChat(app.page);
			console.log("The chat came back and resumed its session.");
		}
		await quit(app);
		console.log(`The app started again (${run + 1}/${WARM_LAUNCHES}).`);
	}

	console.log("Smoke test passed.");
	report("First launch, new data folder", first.launchMs, LAUNCH_TARGET_MS);
	report(
		`Launch, median of ${WARM_LAUNCHES}`,
		median(warmTimes),
		LAUNCH_TARGET_MS,
	);
	report(
		`Palette open, median of ${PALETTE_OPENS}`,
		median(paletteTimes),
		PALETTE_TARGET_MS,
	);
} catch (error) {
	console.error(await readFile(logFile, "utf8").catch(() => "No log file."));
	throw error;
} finally {
	if (running && running.exitCode === null && running.signalCode === null) {
		const exited = once(running, "exit");
		running.kill();
		await exited;
	}
	await rm(dataDir, { recursive: true, force: true });
}
