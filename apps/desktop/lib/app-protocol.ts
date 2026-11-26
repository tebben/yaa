import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { net, protocol } from "electron";

// The built renderer is served from yaa://app/ instead of file://, so the
// page has a real origin for the CSP and for postMessage.
const scheme = "yaa";
export const appOrigin = `${scheme}://app`;

// Must run before the app is ready.
export const registerAppScheme = () => {
	protocol.registerSchemesAsPrivileged([
		{
			scheme,
			privileges: { standard: true, secure: true, supportFetchAPI: true },
		},
	]);
};

export const serveRenderer = (rendererDir: string) => {
	protocol.handle(scheme, (request) => {
		const url = new URL(request.url);
		const file = resolve(rendererDir, `.${decodeURIComponent(url.pathname)}`);
		const inside = relative(rendererDir, file);
		if (
			url.host !== "app" ||
			inside.startsWith(`..${sep}`) ||
			inside === ".."
		) {
			return new Response("Not found", { status: 404 });
		}
		return net.fetch(pathToFileURL(file).toString());
	});
};
