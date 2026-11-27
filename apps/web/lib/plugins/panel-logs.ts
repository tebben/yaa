import type { Disposable } from "@yaa/contracts/protocol";
import type { PanelLogs } from "@yaa/plugin-api/ui";
import type { CoreConnection } from "../core-connection.ts";

type PanelLogsOptions = {
	core: CoreConnection;
	// Disposes what the panel leaves registered when it closes.
	track(disposable: Disposable): Disposable;
};

// One panel's view of the lines core keeps.
export const createPanelLogs = ({
	core: { client, onRestart },
	track,
}: PanelLogsOptions): PanelLogs => ({
	subscribe(listener, failed) {
		// The number of the next line the panel takes; undefined until the
		// kept lines are read. Core answers in order with its events, so a
		// line that arrives before them is among them.
		let next: number | undefined;
		let disposed = false;
		const live = client.subscribe("logs.added", ({ seq, record }) => {
			if (next === undefined || seq < next) return;
			next = seq + 1;
			listener([record]);
		});
		const read = () => {
			next = undefined;
			client.request("logs.recent", {}).then((kept) => {
				if (disposed) return;
				next = kept.next;
				listener(kept.records.map(({ record }) => record));
			}, failed);
		};
		read();
		// A restarted core numbers its lines from the start again, and keeps
		// none of the old core's, so they are all new to the panel.
		const restart = onRestart(read);
		return track({
			dispose() {
				disposed = true;
				live.dispose();
				restart.dispose();
			},
		});
	},
});
