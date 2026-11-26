import { pluginsOrigin } from "@yaa/contracts/app-urls";

// The renderer's CSP. Scripts only from the app itself and its plugin
// folders, which also serve plugin styles and icons. Inline styles are
// allowed because Svelte transitions, dockview's sashes and Vite's dev CSS
// set them; scripts are the part that matters. Plugins start workers from
// blob URLs of their own code, and their CSS may carry fonts as data URLs. In
// dev mode, connect-src also
// allows the Vite dev server's HMR socket, and nothing else.
export const contentSecurityPolicy = (devServerUrl: string | undefined) => {
	const connect = ["'self'"];
	if (devServerUrl !== undefined) {
		const url = new URL(devServerUrl);
		connect.push(`ws://${url.host}`);
	}
	return [
		"default-src 'self'",
		`script-src 'self' ${pluginsOrigin}`,
		`style-src 'self' 'unsafe-inline' ${pluginsOrigin}`,
		`img-src 'self' data: ${pluginsOrigin}`,
		"font-src 'self' data:",
		"worker-src blob:",
		`connect-src ${connect.join(" ")}`,
		"object-src 'none'",
		"base-uri 'none'",
		"form-action 'none'",
		"frame-ancestors 'none'",
	].join("; ");
};
