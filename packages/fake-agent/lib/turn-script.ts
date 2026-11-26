import type {
	ElicitationSchema,
	PermissionOption,
	SessionUpdate,
	StopReason,
	ToolCallUpdate,
	Usage,
} from "@agentclientprotocol/sdk/unstable";

// One step of a scripted turn, played `after` milliseconds after the one
// before it: a session update, a permission request or a question the turn
// waits on, or a failure that ends the turn with an error.
export type TurnStep = { after: number } & (
	| { update: SessionUpdate }
	| { permission: { toolCall: ToolCallUpdate; options: PermissionOption[] } }
	| { question: { message: string; schema: ElicitationSchema } }
	| { fail: string }
);

// A turn the fake agent replays. Its name is the slash command that plays
// it; a prompt that names no script plays the default one.
export type TurnScript = {
	name: string;
	description: string;
	steps: TurnStep[];
	stop: { reason: StopReason; usage?: Usage };
};
