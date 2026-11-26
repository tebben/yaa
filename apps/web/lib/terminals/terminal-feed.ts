import {
	TERMINAL_ACK_CHARS,
	type TerminalOutput,
	type TerminalSnapshot,
} from "@yaa/contracts/terminals";
import type { TerminalScreen } from "@yaa/plugin-api/ui";

type FeedOptions = {
	screen: Pick<TerminalScreen, "reset" | "write">;
	// Tells core how far the screen is.
	ack(offset: number): void;
};

// One attachment's output onto its screen, in order: the snapshot first,
// then what followed it. Output may arrive before the snapshot does, and
// part of it is then in the snapshot already.
export const createTerminalFeed = ({ screen, ack }: FeedOptions) => {
	// Output waiting for the snapshot.
	let early: TerminalOutput[] | undefined = [];
	let acked = 0;

	const show = ({ data, offset }: TerminalOutput) => {
		screen.write(data, () => {
			// Core resumes a paused program once what is unsaid is this little.
			if (offset - acked < TERMINAL_ACK_CHARS) return;
			acked = offset;
			ack(offset);
		});
	};

	return {
		snapshot({ data, offset }: TerminalSnapshot) {
			screen.reset(data);
			acked = offset;
			for (const output of early ?? []) {
				if (output.offset > offset) show(output);
			}
			early = undefined;
		},
		output(output: TerminalOutput) {
			if (early === undefined) show(output);
			else early.push(output);
		},
	};
};
