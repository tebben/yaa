// The app's own URL scheme. The built renderer is served from yaa://app/
// and plugin files from yaa://plugins/<id>/, so the page has a real origin
// for the CSP and plugin modules come from a host the CSP names.
export const appScheme = "yaa";
export const appOrigin = `${appScheme}://app`;
export const pluginsOrigin = `${appScheme}://plugins`;

export const pluginFileUrl = (plugin: string, path: string) =>
	`${pluginsOrigin}/${plugin}/${path}`;
