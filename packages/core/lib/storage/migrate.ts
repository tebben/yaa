import type { DatabaseSync } from "node:sqlite";
import * as z from "zod";

// One SQL script per schema version: the first entry takes an empty database
// to version 1, the second to 2, and so on. Append only: never edit or
// reorder an entry that has shipped.
export type Migrations = readonly string[];

const versionRow = z.object({ user_version: z.number().int() });

export const schemaVersion = (db: DatabaseSync): number =>
	versionRow.parse(db.prepare("PRAGMA user_version").get()).user_version;

// Each migration runs in its own transaction with its version bump, so a
// failure leaves the database at the last version that fully applied.
export const migrate = (db: DatabaseSync, migrations: Migrations): void => {
	const current = schemaVersion(db);
	if (current > migrations.length) {
		throw new Error(
			`Database schema version ${current} is newer than this app knows (${migrations.length})`,
		);
	}
	migrations.slice(current).forEach((sql, index) => {
		const version = current + index + 1;
		db.exec("BEGIN");
		try {
			db.exec(sql);
			db.exec(`PRAGMA user_version = ${version}`);
			db.exec("COMMIT");
		} catch (error) {
			db.exec("ROLLBACK");
			throw new Error(`Migration to schema version ${version} failed`, {
				cause: error,
			});
		}
	});
};
