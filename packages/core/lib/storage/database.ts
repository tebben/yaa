import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrate.ts";
import { migrations } from "./migrations.ts";

// The only module that opens the database: node:sqlite stays behind it
// (docs/decisions/0019-native-modules-node-sqlite.md).
export const openDatabase = (path: string): DatabaseSync => {
	if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	db.exec("PRAGMA journal_mode = WAL");
	db.exec("PRAGMA foreign_keys = ON");
	migrate(db, migrations);
	return db;
};
