// @ts-check
// Deep-module enforcement for dependency-cruiser, from the setup-ts-deep-modules
// skill (.claude/skills/setup-ts-deep-modules), adapted to three package roots.
//
// Each workspace package under apps/, packages/ or plugins/ is a DEEP MODULE.
// Its PUBLIC SURFACE is its ENTRY POINTS: the files at the package root.
// Everything in a subfolder is private (by convention `lib/` and `tests/`).
// See packages/README.md.

/** Package roots. One immediate child dir per package (flat, no nesting). */
const ROOTS = "(?:apps|packages|plugins)";

// --- derived patterns (no need to edit) -------------------------------------
/** A package, captured as $1, e.g. `packages/core`. */
const PACKAGE = `^(${ROOTS}/[^/]+)/`;
/** Anything nested inside a package subfolder. Root files are not matched. */
const PACKAGE_INTERNALS = `^${ROOTS}/[^/]+/[^/]+/`;
const TESTS = `^${ROOTS}/[^/]+/tests/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: "entrypoint-boundary-from-app",
			comment:
				"Code outside the packages may import a package's entry points (its root files), but nothing inside its subfolders.",
			severity: "error",
			from: { pathNot: `^${ROOTS}/` },
			to: { path: PACKAGE_INTERNALS },
		},
		{
			name: "entrypoint-boundary-across-packages",
			comment:
				"A package's own files import each other freely, but reach OTHER packages only through their entry points, never their internals.",
			severity: "error",
			from: { path: PACKAGE, pathNot: TESTS },
			to: { path: PACKAGE_INTERNALS, pathNot: "^$1/" },
		},
		{
			name: "tests-through-entrypoints",
			comment:
				"Tests import any package's entry points and their own tests/ fixtures, but never any package's internals, not even their own.",
			severity: "error",
			from: { path: `^(${ROOTS}/[^/]+)/tests/` },
			to: { path: PACKAGE_INTERNALS, pathNot: "^$1/tests/" },
		},
		{
			name: "tests-folder-is-private",
			comment: "A package's tests/ folder is reachable only from tests.",
			severity: "error",
			from: { pathNot: TESTS },
			to: { path: TESTS },
		},
		{
			name: "no-circular",
			comment: "No dependency cycles.",
			severity: "error",
			from: {},
			to: { circular: true },
		},

		// --- Layering --------------------------------------------------------------
		{
			name: "plugins-not-core",
			comment:
				"Plugins use plugin-api, contracts and ui, never core (docs/spec/03-plugins.md).",
			severity: "error",
			from: { path: "^plugins/" },
			to: { path: "^packages/core/" },
		},
		{
			name: "renderer-not-core",
			comment:
				"The renderer is a thin client: it reaches core only through the typed protocol (docs/spec/00-overview.md).",
			severity: "error",
			from: { path: "^(apps/web|packages/ui)/" },
			to: { path: "^packages/core/" },
		},
		// --- Svelte structure (setup-svelte-structure skill, docs/rules/svelte.md) ---
		{
			name: "svelte-no-transport",
			comment:
				"Components never touch the transport: they go through a .svelte.ts controller, which uses the typed client from contracts.",
			severity: "error",
			from: { path: "\\.svelte$" },
			to: { path: "^packages/contracts/client\\.ts$" },
		},
		{
			name: "pure-ts-no-svelte",
			comment:
				"Pure .ts modules hold logic without Svelte: they never import .svelte files. Entry points (index.ts, and a package's root files) may, to expose components.",
			severity: "error",
			from: {
				path: "\\.ts$",
				pathNot: [
					"\\.svelte\\.ts$",
					"(^|/)index\\.ts$",
					`^${ROOTS}/[^/]+/[^/]+\\.ts$`,
				],
			},
			to: { path: "\\.svelte$" },
		},
	],
	options: {
		includeOnly: `^(${ROOTS}|scripts)/`,
		doNotFollow: { path: "node_modules" },
		tsConfig: { fileName: "tsconfig.json" },
		enhancedResolveOptions: {
			extensions: [".ts", ".js", ".json", ".svelte"],
		},
	},
};
