import { type Disposable, ProtocolError } from "@yaa/contracts/protocol";
import type { Terminal } from "@yaa/contracts/terminals";
import type { TerminalLink, TerminalScreen } from "@yaa/plugin-api/ui";
import type { CoreConnection } from "../core-connection.ts";
import { createTerminalFeed } from "./terminal-feed.ts";

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The renderer's side of core's terminals, for the panels that show them.
export const createTerminalLinks = ({ client, onRestart }: CoreConnection) => {
	// A core that went away fails what it had not answered. What was asked is
	// asked again of the next one, so only other failures count.
	const unlessLost = (report: (reason: unknown) => void) => {
		return (reason: unknown) => {
			if (
				reason instanceof ProtocolError &&
				reason.code === "connection_lost"
			) {
				return;
			}
			report(reason);
		};
	};
	const failed = (screen: TerminalScreen) =>
		unlessLost((reason) => screen.fail(describe(reason)));
	const send = (request: Promise<unknown>, screen: TerminalScreen) => {
		request.catch(failed(screen));
	};

	return {
		watch(
			worktree: string,
			listener: (terminals: readonly Terminal[]) => void,
		): Disposable {
			let disposed = false;
			// A change that overtakes the list is newer than it.
			let changed = false;
			const subscription = client.subscribe("terminals.changed", (state) => {
				if (state.worktree !== worktree) return;
				changed = true;
				listener(state.terminals);
			});
			const list = () => {
				changed = false;
				client.request("terminals.list", { worktree }).then(
					({ terminals }) => {
						if (!disposed && !changed) listener(terminals);
					},
					unlessLost((reason) => {
						throw reason;
					}),
				);
			};
			list();
			const restart = onRestart(list);
			return {
				dispose() {
					disposed = true;
					subscription.dispose();
					restart.dispose();
				},
			};
		},
		async create(worktree: string) {
			return (await client.request("terminals.create", { worktree })).id;
		},
		async close(id: string) {
			await client.request("terminals.close", { id });
		},
		connect(id: string, screen: TerminalScreen): TerminalLink {
			const view = crypto.randomUUID();
			let feed: ReturnType<typeof createTerminalFeed> | undefined;
			const subscription = client.subscribe("terminals.output", (output) => {
				if (output.id === id) feed?.output(output);
			});
			const attach = () => {
				const current = createTerminalFeed({
					screen,
					ack: (offset) =>
						send(client.request("terminals.ack", { id, view, offset }), screen),
				});
				feed = current;
				client.request("terminals.attach", { id, view, ...screen.size() }).then(
					(snapshot) => {
						if (feed === current) current.snapshot(snapshot);
					},
					(reason: unknown) => {
						if (feed === current) failed(screen)(reason);
					},
				);
			};
			attach();
			const restart = onRestart(attach);
			return {
				write: (data) =>
					send(client.request("terminals.write", { id, data }), screen),
				resize: (size) =>
					send(client.request("terminals.resize", { id, ...size }), screen),
				dispose() {
					feed = undefined;
					subscription.dispose();
					restart.dispose();
					send(client.request("terminals.detach", { id, view }), screen);
				},
			};
		},
	};
};

export type TerminalLinks = ReturnType<typeof createTerminalLinks>;
