// The fake ACP agent (docs/spec/05-agents-chat.md): main.ts runs it as a
// process over stdio; tests connect to it in-process through
// `connectFakeAgent`.
export {
	connectFakeAgent,
	createFakeAgent,
	type FakeAgentOptions,
} from "./lib/fake-agent.ts";
export type { TurnScript, TurnStep } from "./lib/turn-script.ts";
