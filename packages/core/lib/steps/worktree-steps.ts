import type { CoreEvent, StepPhase } from "@yaa/contracts/core-events";
import type { Logger } from "@yaa/contracts/log";
import { worktreeStepsPath } from "@yaa/contracts/worktree-steps";
import type { GitService } from "../git/git-service.ts";
import { type CopyFiles, copyFiles } from "./copy-files.ts";
import { type ReadSteps, readSteps } from "./read-steps.ts";
import { type RunCommand, runCommand } from "./run-command.ts";

export type StepsTarget = {
	// The worktree's id, its stable index and its folder.
	worktree: string;
	index: number;
	path: string;
	// The project's main checkout, which holds the steps and the files.
	checkout: string;
};

export type StepsRunner = {
	// Copies the files and runs the setup commands. A failure is logged and
	// recorded as an event; it is also given back.
	setup(target: StepsTarget): Promise<{ problem?: string }>;
	// Stops a setup still running, then runs the teardown commands.
	teardown(target: StepsTarget): Promise<{ problem?: string }>;
	// Ends what runs for the worktree, resolving once it has.
	stop(worktree: string): Promise<void>;
	// For the core's exit: ends everything and records it before returning.
	shutdown(): void;
};

type StepsRunnerOptions = {
	git: Pick<GitService, "untracked">;
	events: { append(event: CoreEvent): void };
	log: Logger;
	env?: NodeJS.ProcessEnv;
	read?: ReadSteps;
	copy?: CopyFiles;
	run?: RunCommand;
};

// How much of a failed step's output its event keeps.
const KEPT_LINES = 20;

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The step under way: what it is called and the last lines it wrote.
type Step = { name: string; output: string[] };

type Run = {
	phase: StepPhase;
	step: Step;
	// Whether the file has steps for this phase, once it is read.
	started: boolean;
	abort: AbortController;
	done: Promise<{ problem?: string }>;
};

// A worktree's setup and teardown (docs/spec/02-worktrees.md), one run per
// worktree at a time. Each line a step writes is logged with the worktree
// and the step.
export const createStepsRunner = ({
	git,
	events,
	log,
	env = process.env,
	read = readSteps,
	copy = copyFiles,
	run = runCommand,
}: StepsRunnerOptions): StepsRunner => {
	const running = new Map<string, Run>();
	let closed = false;

	const failed = (
		worktree: string,
		{ phase, step }: Pick<Run, "phase" | "step">,
		reason: string,
	) => {
		log.error(`${phase} failed: ${reason}`, {
			worktree,
			phase,
			step: step.name,
		});
		events.append({
			type: "worktree.steps.failed",
			worktree,
			phase,
			step: step.name,
			reason,
			output: step.output,
		});
	};

	const perform = async (target: StepsTarget, current: Run) => {
		const { phase } = current;
		const { worktree } = target;
		const { signal } = current.abort;
		const steps = await read(target.checkout);
		const copies = phase === "setup" && steps.copy.length > 0;
		if (!copies && steps[phase].length === 0) return;
		current.started = true;
		events.append({ type: "worktree.steps.started", worktree, phase });
		const begin = (name: string) => {
			signal.throwIfAborted();
			const step: Step = { name, output: [] };
			current.step = step;
			return (text: string) => {
				step.output = [...step.output, text].slice(-KEPT_LINES);
				log.forWorktree(worktree).info(text, { phase, step: name });
			};
		};
		if (copies) {
			const line = begin("copy");
			const paths = await git.untracked(target.checkout, steps.copy);
			if (paths.length === 0) line("No untracked files match");
			await copy({
				from: target.checkout,
				to: target.path,
				paths,
				signal,
				copied: (path) => line(`Copied ${path}`),
				kept: (path) => line(`Kept ${path}, which the worktree has already`),
			});
		}
		for (const command of steps[phase]) {
			const line = begin(command);
			line(`$ ${command}`);
			const { problem } = await run({
				command,
				cwd: target.path,
				env: { ...env, YAA_WORKTREE_INDEX: String(target.index) },
				signal,
				line,
			});
			signal.throwIfAborted();
			if (problem !== undefined) throw new Error(problem);
		}
		events.append({ type: "worktree.steps.succeeded", worktree, phase });
	};

	// The run is on the map from the start, so a stop that comes while the
	// file is still being read reaches it.
	const start = (target: StepsTarget, phase: StepPhase) => {
		const { worktree } = target;
		const current: Run = {
			phase,
			step: { name: worktreeStepsPath, output: [] },
			started: false,
			abort: new AbortController(),
			done: Promise.resolve({}),
		};
		running.set(worktree, current);
		current.done = perform(target, current).then(
			() => {
				running.delete(worktree);
				return {};
			},
			(error: unknown) => {
				// Shutting down has recorded it already.
				if (closed) return {};
				running.delete(worktree);
				const reason = current.abort.signal.aborted
					? "Stopped"
					: describe(error);
				failed(worktree, current, reason);
				return { problem: `${current.step.name}: ${reason}` };
			},
		);
		return current.done;
	};

	const stop = async (worktree: string) => {
		const current = running.get(worktree);
		current?.abort.abort();
		await current?.done;
	};

	return {
		setup: (target) => start(target, "setup"),
		async teardown(target) {
			await stop(target.worktree);
			return start(target, "teardown");
		},
		stop,
		shutdown() {
			closed = true;
			for (const [worktree, current] of running) {
				current.abort.abort();
				if (current.started) {
					failed(worktree, current, "yaa closed while it ran");
				}
			}
			running.clear();
		},
	};
};
