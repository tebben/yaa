import { describe, expect, it } from "vitest";
import { pluginManifest } from "../plugin-manifest.ts";

const hello = {
	id: "hello",
	version: "0.1.0",
	main: "dist/main.js",
	ui: "dist/ui.js",
	styles: "dist/ui.css",
	contributes: {
		commands: [{ id: "hello.greet", title: "Say hello" }],
		keybindings: [{ key: "ctrl+alt+h", command: "hello.greet" }],
		panels: [{ id: "hello", title: "Hello", icon: "icon.svg" }],
	},
};

const messages = (manifest: unknown) => {
	const result = pluginManifest.safeParse(manifest);
	return result.success
		? []
		: result.error.issues.map(({ message }) => message);
};

describe("plugin manifest schema", () => {
	it("accepts a plugin with a command, a key and a panel", () => {
		expect(messages(hello)).toEqual([]);
	});

	it("defaults the activation events and contributions", () => {
		expect(pluginManifest.parse({ id: "bare", version: "1.0.0" })).toEqual({
			id: "bare",
			version: "1.0.0",
			activationEvents: [],
			contributes: { commands: [], keybindings: [], panels: [] },
		});
	});

	it("rejects ids, versions and fields it does not know", () => {
		expect(messages({ ...hello, id: "Hello" })).not.toEqual([]);
		expect(messages({ ...hello, version: "1" })).not.toEqual([]);
		expect(messages({ ...hello, activationEvents: ["*"] })).not.toEqual([]);
		expect(messages({ ...hello, mian: "dist/main.js" })).not.toEqual([]);
	});

	it("rejects paths that leave the plugin folder", () => {
		expect(messages({ ...hello, main: "../core/main.js" })).not.toEqual([]);
		expect(messages({ ...hello, ui: "/etc/ui.js" })).not.toEqual([]);
		expect(messages({ ...hello, ui: "dist/../../ui.js" })).not.toEqual([]);
	});

	it("rejects contributions outside the plugin's namespace or listed twice", () => {
		const contributes = (patch: object) =>
			messages({ ...hello, contributes: { ...hello.contributes, ...patch } });
		expect(
			contributes({ commands: [{ id: "palette.open", title: "Open" }] }),
		).toContain("Expected hello or hello.<name>");
		expect(
			contributes({
				commands: [
					{ id: "hello.greet", title: "A" },
					{ id: "hello.greet", title: "B" },
				],
			}),
		).toContain("Command hello.greet is listed twice");
		expect(
			contributes({ panels: [{ id: "chat", title: "Chat", icon: "i.svg" }] }),
		).toContain("Expected hello or hello.<name>");
	});

	it("rejects keys bound to commands the plugin does not contribute", () => {
		expect(
			messages({
				...hello,
				contributes: {
					...hello.contributes,
					keybindings: [{ key: "ctrl+w", command: "-panel.close" }],
				},
			}),
		).toContain("Expected a command this plugin contributes");
	});

	it("rejects commands without a backend and panels without a UI module", () => {
		const { main: _main, ...noMain } = hello;
		const { ui: _ui, styles: _styles, ...noUi } = hello;
		expect(messages(noMain)).toContain("Commands need a backend module");
		expect(messages(noUi)).toContain("Panels need a UI module");
	});
});
