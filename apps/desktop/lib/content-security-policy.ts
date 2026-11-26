// The renderer's CSP. Scripts only from the app itself. Inline styles are
// allowed because Svelte transitions, dockview's sashes and Vite's dev CSS
// set them; scripts are the part that matters. In dev mode, connect-src also
// allows the Vite dev server's HMR socket, and nothing else.
export const contentSecurityPolicy = (devServerUrl: string | undefined) => {
	const connect = ["'self'"];
	if (devServerUrl !== undefined) {
		const url = new URL(devServerUrl);
		connect.push(`ws://${url.host}`);
	}
	return [
		"default-src 'self'",
		"script-src 'self'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data:",
		"font-src 'self'",
		`connect-src ${connect.join(" ")}`,
		"object-src 'none'",
		"base-uri 'none'",
		"form-action 'none'",
		"frame-ancestors 'none'",
	].join("; ");
};
