import type { Logger } from "@yaa/contracts/log";
import type {
	SettingChange,
	SettingDefinitions,
	SettingsState,
} from "@yaa/contracts/settings";
import { editSettingsText } from "./edit-settings-text.ts";
import { resolveSettings } from "./resolve-settings.ts";
import { type SettingsFile, watchSettingsFile } from "./watch-settings-file.ts";

export type AppSettings = Pick<
	SettingsFile<SettingsState>,
	"current" | "onChange"
> & {
	// Writes a change from the settings page to the file.
	set(change: SettingChange): void;
};

type AppSettingsOptions<D extends SettingDefinitions> = {
	dir: string;
	// Core's settings and the ones plugins contribute.
	definitions: D;
	log: Logger;
};

// settings.json: read and watched, and written by the settings page
// (docs/spec/11-platform-services.md).
export const createAppSettings = <D extends SettingDefinitions>({
	dir,
	definitions,
	log,
}: AppSettingsOptions<D>) => {
	const file = watchSettingsFile({
		dir,
		name: "settings.json",
		resolve: (text) => resolveSettings(definitions, text),
		log,
	});
	return {
		current: file.current,
		onChange: file.onChange,
		set({ key, value }: SettingChange) {
			const schema = Object.hasOwn(definitions, key)
				? definitions[key]
				: undefined;
			if (schema === undefined) throw new Error(`No setting ${key}`);
			const checked = schema.safeParse(value);
			if (!checked.success) {
				throw new Error(`${key}: ${checked.error.issues[0]?.message}`);
			}
			// The file keeps only what differs from the defaults.
			const isDefault =
				JSON.stringify(checked.data) ===
				JSON.stringify(schema.parse(undefined));
			file.write(
				editSettingsText(
					file.text(),
					key,
					isDefault ? undefined : checked.data,
				),
			);
		},
	} satisfies AppSettings;
};
