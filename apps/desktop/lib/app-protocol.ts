import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { appScheme } from "@yaa/contracts/app-urls";
import { net, protocol } from "electron";

// Must run before the app is ready. CORS is enabled so the Vite dev
// server's page can import plugin modules in dev mode.
export const registerAppScheme = () => {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: appScheme,
			privileges: {
				standard: true,
				secure: true,
				supportFetchAPI: true,
				corsEnabled: true,
			},
		},
	]);
};

const notFound = () => new Response("Not found", { status: 404 });

// The file at `path` inside `dir`, or undefined when the path leaves it.
const inside = (dir: string, path: string): string | undefined => {
	const file = resolve(dir, `.${decodeURIComponent(path)}`);
	const rest = relative(dir, file);
	return rest.startsWith(`..${sep}`) || rest === ".." ? undefined : file;
};

type Folders = {
	// The built renderer, served from yaa://app/. Undefined in dev mode,
	// where the Vite dev server serves it.
	renderer: string | undefined;
	// Plugin folders, served from yaa://plugins/<id>/.
	plugins: string;
};

export const serveAppScheme = ({ renderer, plugins }: Folders) => {
	protocol.handle(appScheme, async (request) => {
		const url = new URL(request.url);
		if (url.host === "app" && renderer !== undefined) {
			const file = inside(renderer, url.pathname);
			return file === undefined
				? notFound()
				: net.fetch(pathToFileURL(file).toString());
		}
		if (url.host === "plugins") {
			const file = inside(plugins, url.pathname);
			if (file === undefined) return notFound();
			const response = await net.fetch(pathToFileURL(file).toString());
			// Plugin files are the app's own and secret to no one; the header
			// lets the dev server's page load them as modules.
			const headers = new Headers(response.headers);
			headers.set("Access-Control-Allow-Origin", "*");
			return new Response(response.body, {
				status: response.status,
				headers,
			});
		}
		return notFound();
	});
};
