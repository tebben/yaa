import type { PluginProvider } from "@yaa/contracts/plugin-manifest";
import type { Worktree } from "@yaa/contracts/projects";
import {
	type Disposable,
	eventSchema,
	ProtocolError,
	resultSchema,
	safeParse,
} from "@yaa/contracts/protocol";
import type { OpenFile, PanelContext, PickSource } from "@yaa/plugin-api/ui";
import type { PanelFrame } from "@yaa/ui/dock";
import { captureKeys } from "../commands/index.ts";
import type { CoreClient } from "../core-connection.ts";
import type { TerminalLinks } from "../terminals/index.ts";
import { createPanelAgents } from "./panel-agents.ts";
import type { PanelHandlers } from "./panel-handlers.ts";

type PanelContextOptions = {
	client: CoreClient;
	terminals: TerminalLinks;
	// What panels registered for their commands and for files to open.
	commands: PanelHandlers<void>;
	files: PanelHandlers<OpenFile>;
	openFile(file: OpenFile): void;
	pick(source: PickSource): void;
	providers: Promise<readonly PluginProvider[]>;
	frame: PanelFrame;
	plugin: string;
	kind: string;
	// The commands the plugin contributes to this panel.
	declared: ReadonlySet<string>;
	worktree: Worktree;
};

// The context of one plugin panel. `dispose` undoes everything the panel
// registered through it.
export const createPanelContext = ({
	client,
	terminals,
	commands,
	files,
	openFile,
	pick,
	providers,
	frame,
	plugin,
	kind,
	declared,
	worktree,
}: PanelContextOptions): { context: PanelContext; dispose(): void } => {
	const registered = new Set<Disposable>();
	const track = (disposable: Disposable): Disposable => {
		registered.add(disposable);
		return {
			dispose() {
				if (registered.delete(disposable)) disposable.dispose();
			},
		};
	};

	const context: PanelContext = {
		worktree,
		backend: (protocol) => ({
			async request(method, params) {
				const reply = await client.request("plugins.call", {
					plugin,
					method,
					params,
				});
				const parsed = safeParse(resultSchema(protocol, method), reply.result);
				if (parsed.success) return parsed.data;
				throw new ProtocolError(
					"invalid_result",
					`Invalid result for ${method}: ${parsed.error.message}`,
				);
			},
			subscribe(event, listener) {
				const schema = eventSchema(protocol, event);
				return track(
					client.subscribe("plugins.event", (sent) => {
						if (sent.plugin !== plugin || sent.event !== event) return;
						const parsed = safeParse(schema, sent.payload);
						// The plugin is both ends: a bad payload is its bug.
						if (!parsed.success) throw parsed.error;
						listener(parsed.data);
					}),
				);
			},
			onRestart: (listener) =>
				track(client.subscribe("plugins.reset", () => listener())),
		}),
		agents: createPanelAgents({
			client,
			worktree: worktree.id,
			providers,
			track,
		}),
		async pickFiles() {
			return (await client.request("dialog.pickFiles", {})).paths;
		},
		commands: {
			register(command, handler) {
				if (!declared.has(command)) {
					throw new Error(
						`Plugin ${plugin} registered ${command}, which its manifest does not contribute to this panel`,
					);
				}
				return track(commands.register(worktree.id, command, handler));
			},
		},
		header: frame.header,
		handleClose: (handler) => track({ dispose: frame.handleClose(handler) }),
		openFile,
		handleOpenFile: (handler) =>
			track(files.register(worktree.id, kind, handler)),
		pick,
		terminals: {
			watch: (listener) => track(terminals.watch(worktree.id, listener)),
			create: () => terminals.create(worktree.id),
			close: terminals.close,
			connect(id, screen) {
				const link = terminals.connect(id, screen);
				const { dispose } = track(link);
				return { ...link, dispose };
			},
		},
		captureKeys,
	};

	return {
		context,
		dispose() {
			for (const disposable of registered) disposable.dispose();
			registered.clear();
		},
	};
};
