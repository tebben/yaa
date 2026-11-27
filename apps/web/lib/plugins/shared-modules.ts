import { type SharedModule, sharedModulesKey } from "@yaa/contracts/plugin-ui";
import * as ui from "@yaa/ui";
import * as uiFocus from "@yaa/ui/focus";
import * as uiScroll from "@yaa/ui/scroll";
import * as svelte from "svelte";
import * as animate from "svelte/animate";
import * as attachments from "svelte/attachments";
import * as easing from "svelte/easing";
import * as events from "svelte/events";
import * as client from "svelte/internal/client";
import * as motion from "svelte/motion";
import * as reactivity from "svelte/reactivity";
import * as reactivityWindow from "svelte/reactivity/window";
import * as store from "svelte/store";
import * as transition from "svelte/transition";

// The real namespaces of the modules plugins share with the app, so plugin
// code runs on the app's one Svelte runtime and its ui components
// (docs/decisions/0015-plugin-ui-loading.md). Keyed by every shared
// specifier, so a specifier added to the contract fails to compile here.
const registry: Record<SharedModule, object> = {
	svelte,
	"svelte/animate": animate,
	"svelte/attachments": attachments,
	"svelte/easing": easing,
	"svelte/events": events,
	"svelte/motion": motion,
	"svelte/reactivity": reactivity,
	"svelte/reactivity/window": reactivityWindow,
	"svelte/store": store,
	"svelte/transition": transition,
	"svelte/internal/client": client,
	// Imported by compiled code for its side effect, which the app's own
	// components have already run.
	"svelte/internal/init-operations": {},
	"@yaa/ui": ui,
	"@yaa/ui/focus": uiFocus,
	"@yaa/ui/scroll": uiScroll,
};

// Must run before any plugin module loads.
export const shareModules = () => {
	Object.defineProperty(globalThis, sharedModulesKey, { value: registry });
};
