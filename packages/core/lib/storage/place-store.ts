import type { DatabaseSync } from "node:sqlite";
import { type Place, place } from "@yaa/contracts/projects";
import * as z from "zod";

// Where the window was, so it opens there again
// (docs/spec/11-platform-services.md).
export type PlaceStore = {
	get(): Place | undefined;
	save(place: Place): void;
};

const KEY = "place";
const row = z.object({ value: z.string() });

export const createPlaceStore = (db: DatabaseSync): PlaceStore => {
	const select = db.prepare("SELECT value FROM app_state WHERE key = ?");
	const upsert = db.prepare(
		`INSERT INTO app_state (key, value) VALUES (?, ?)
		ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
	);
	return {
		get() {
			const found = select.get(KEY);
			return found === undefined
				? undefined
				: place.parse(JSON.parse(row.parse(found).value));
		},
		save(next) {
			upsert.run(KEY, JSON.stringify(place.parse(next)));
		},
	};
};
