import icons from "@iconify-json/catppuccin/icons.json";
import { fileIconName } from "@yaa/ui/file-icons";
import { describe, expect, it } from "vitest";

describe("fileIconName", () => {
	it("knows files by name, case ignored, before their extension", () => {
		expect(fileIconName("package.json")).toBe("package-json");
		expect(fileIconName("docs/LICENSE")).toBe("license");
		expect(fileIconName("README.md")).toBe("readme");
		expect(fileIconName("pnpm-lock.yaml")).toBe("pnpm-lock");
	});

	it("knows families of files by how their name starts", () => {
		expect(fileIconName("tsconfig.web.json")).toBe("typescript-config");
		expect(fileIconName("apps/web/vite.config.ts")).toBe("vite");
		expect(fileIconName(".env.local")).toBe("env");
	});

	it("takes the longest known extension", () => {
		expect(fileIconName("lib/dock.svelte.ts")).toBe("svelte");
		expect(fileIconName("types.d.ts")).toBe("typescript-def");
		expect(fileIconName("tests/a.test.ts")).toBe("typescript-test");
		expect(fileIconName("lib/a.ts")).toBe("typescript");
		expect(fileIconName("Main.svelte")).toBe("svelte");
		expect(fileIconName(".mcp.json")).toBe("json");
	});

	it("has none for an unknown kind or a dotfile it does not know", () => {
		expect(fileIconName("notes.xyz")).toBeUndefined();
		expect(fileIconName(".nvmrc")).toBeUndefined();
		expect(fileIconName("Procfile")).toBeUndefined();
	});

	it("names only icons the set has", () => {
		const names = [
			"package.json",
			"a.d.ts",
			"a.test.js",
			"a.js.map",
			"a.css.map",
			"tsconfig.json",
			"Dockerfile",
			"compose.yaml",
			"a.mdx",
			"a.png",
			"a.zip",
			"a.wasm",
			"a.sql",
			"a.properties",
		];
		for (const name of names) {
			expect(Object.keys(icons.icons)).toContain(fileIconName(name));
		}
	});
});
