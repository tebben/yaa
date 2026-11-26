import * as z from "zod";
import { fileProblem } from "./file-problem.ts";

// One schema per setting, keyed `namespace.name`. The schema carries the
// default, which a missing or rejected value falls back to.
export type SettingDefinitions = Record<string, z.ZodDefault>;

// The settings core defines; plugin settings join these with the settings
// contribution point. The worktree settings are app-wide until the project
// layer arrives (M6, docs/spec/11-platform-services.md).
export const coreSettings = {
	// Where new worktrees go, as <directory>/<project>/<worktree>; a leading
	// ~ is the home folder (docs/decisions/0010-worktree-location.md).
	"worktree.directory": z
		.string()
		.min(1)
		.default("~/.local/share/yaa/worktrees"),
	// The branch name of a new worktree (docs/spec/02-worktrees.md).
	"worktree.branchTemplate": z.string().min(1).default("{ticketId}-{slug}"),
	// Put before a bare ticket number, such as "PROJ-".
	"worktree.ticketPrefix": z.string().default(""),
} satisfies SettingDefinitions;

export type CoreSettings = z.infer<z.ZodObject<typeof coreSettings>>;

// settings.json as core resolved it, sent to clients.
export const settingsState = z.object({
	values: z.record(z.string(), z.unknown()),
	problems: z.array(fileProblem),
});

export type SettingsState = z.infer<typeof settingsState>;
