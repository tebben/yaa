import { createDock, type DockController } from "@yaa/ui/dock";
import type { CoreClient } from "./core-connection.ts";
import { defaultLayout, panelKinds } from "./panels/index.ts";

// Dragging a sash changes the layout on every frame; save once it settles.
const SAVE_DELAY_MS = 500;

// The dock grid, created once core has returned the saved layout, and saved
// back to core as it changes.
export const createLayout = (client: CoreClient) => {
	let dock = $state.raw<DockController>();
	let error = $state<string>();
	let timer: ReturnType<typeof setTimeout> | undefined;

	const fail = (reason: unknown) => {
		error = String(reason);
	};
	const save = (layout: string) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			client.request("layout.save", { layout }).catch(fail);
		}, SAVE_DELAY_MS);
	};

	client.request("layout.get", {}).then(({ layout }) => {
		dock = createDock({
			kinds: panelKinds,
			layout: layout ?? undefined,
			defaultLayout,
			onChange: save,
		});
	}, fail);

	return {
		get dock() {
			return dock;
		},
		get error() {
			return error;
		},
	};
};

export type LayoutController = ReturnType<typeof createLayout>;
