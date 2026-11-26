import { createDock, type DockController, type PanelKind } from "@yaa/ui/dock";
import type { CoreClient } from "./core-connection.ts";
import { defaultLayout } from "./panels/index.ts";

// Dragging a sash changes the layout on every frame; save once it settles.
const SAVE_DELAY_MS = 500;

type LayoutOptions = {
	client: CoreClient;
	// Every panel kind, the plugins' included.
	kinds: Promise<ReadonlyMap<string, PanelKind>>;
	fail(reason: unknown): void;
};

// The dock grid, created once core has returned the saved layout and the
// plugins, and saved back to core as it changes.
export const createLayout = ({ client, kinds, fail }: LayoutOptions) => {
	let dock = $state.raw<DockController>();
	let available = $state.raw<ReadonlyMap<string, PanelKind>>(new Map());
	let timer: ReturnType<typeof setTimeout> | undefined;

	const save = (layout: string) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			client.request("layout.save", { layout }).catch(fail);
		}, SAVE_DELAY_MS);
	};

	Promise.all([client.request("layout.get", {}), kinds]).then(
		([{ layout }, all]) => {
			available = all;
			dock = createDock({
				kinds: all,
				layout: layout ?? undefined,
				defaultLayout,
				onChange: save,
			});
		},
		fail,
	);

	return {
		get dock() {
			return dock;
		},
		// Empty until the dock exists.
		get kinds() {
			return available;
		},
	};
};

export type LayoutController = ReturnType<typeof createLayout>;
