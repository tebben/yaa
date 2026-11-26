import * as z from "zod";
import { fileProblem } from "./file-problem.ts";

// One schema per setting, keyed `namespace.name`. The schema carries the
// default, which a missing or rejected value falls back to.
export type SettingDefinitions = Record<string, z.ZodDefault>;

// The settings core defines. None are read yet; plugin settings join these
// in M1 step 7 and core's own arrive with the features that use them.
export const coreSettings = {} satisfies SettingDefinitions;

// settings.json as core resolved it, sent to clients.
export const settingsState = z.object({
	values: z.record(z.string(), z.unknown()),
	problems: z.array(fileProblem),
});

export type SettingsState = z.infer<typeof settingsState>;
