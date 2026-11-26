import * as z from "zod";

// Something wrong in a file the user edits, such as settings.json. The rest
// of the file still applies (docs/spec/11-platform-services.md).
export const fileProblem = z.object({
	// Where in the file: [] for the whole file, ["editor.fontSize"] for a
	// setting, [3, "key"] for a field of the fourth keybinding.
	path: z.array(z.union([z.string(), z.number()])),
	message: z.string(),
});

export type FileProblem = z.infer<typeof fileProblem>;
