import { BrowserWindow, session, shell } from "electron";

type WindowOptions = { preload: string; url: string };

// Applies to every page of the default session: CSP on every response, the
// yaa:// protocol included, and no permissions granted to web content.
export const hardenSession = (policy: string) => {
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({
			responseHeaders: {
				...details.responseHeaders,
				"Content-Security-Policy": [policy],
			},
		});
	});
	session.defaultSession.setPermissionRequestHandler((_c, _p, callback) =>
		callback(false),
	);
	session.defaultSession.setPermissionCheckHandler(() => false);
};

export const openWindow = ({ preload, url }: WindowOptions): BrowserWindow => {
	const window = new BrowserWindow({
		width: 1440,
		height: 900,
		show: false,
		webPreferences: {
			preload,
			contextIsolation: true,
			sandbox: true,
			nodeIntegration: false,
			webviewTag: false,
			spellcheck: false,
			// A throttled page takes in terminal output about once a second, which
			// would pause the program in a terminal while the window is hidden.
			backgroundThrottling: false,
		},
	});
	// The app opens no second window: a web link goes to the browser.
	window.webContents.setWindowOpenHandler(({ url: target }) => {
		if (["http:", "https:"].includes(new URL(target).protocol)) {
			void shell.openExternal(target);
		}
		return { action: "deny" };
	});
	// Reloads stay allowed; leaving the app's own origin is not. Compared by
	// scheme and host, because URL gives yaa:// an opaque origin.
	const app = new URL(url);
	window.webContents.on("will-navigate", (event) => {
		const target = new URL(event.url);
		if (target.protocol !== app.protocol || target.host !== app.host) {
			event.preventDefault();
		}
	});
	window.once("ready-to-show", () => window.show());
	void window.loadURL(url);
	return window;
};
