import { DatabaseSync } from "node:sqlite";
import { coreEvent } from "@yaa/contracts/core-events";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import {
	createEventLog,
	createLayoutStore,
	createPluginStore,
	migrate,
	openDatabase,
	schemaVersion,
} from "../storage.ts";

const tables = (db: DatabaseSync) =>
	db
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
		)
		.all()
		.map((row) => row["name"]);

describe("migrate", () => {
	const migrations = [
		"CREATE TABLE a (x INTEGER)",
		"CREATE TABLE b (x INTEGER)",
	];

	it("takes an empty database to the latest version", () => {
		const db = new DatabaseSync(":memory:");
		migrate(db, migrations);
		expect(schemaVersion(db)).toBe(2);
		expect(tables(db)).toEqual(["a", "b"]);
	});

	it("applies only the migrations after the current version", () => {
		const db = new DatabaseSync(":memory:");
		migrate(db, migrations.slice(0, 1));
		db.exec("INSERT INTO a VALUES (1)");
		migrate(db, migrations);
		expect(schemaVersion(db)).toBe(2);
		expect(db.prepare("SELECT x FROM a").all()).toEqual([{ x: 1 }]);
	});

	it("rolls a failing migration back and keeps the last good version", () => {
		const db = new DatabaseSync(":memory:");
		const broken = [...migrations, "CREATE TABLE c (x INTEGER); NOT SQL"];
		expect(() => migrate(db, broken)).toThrow("schema version 3");
		expect(schemaVersion(db)).toBe(2);
		expect(tables(db)).toEqual(["a", "b"]);
	});

	it("refuses a database from a newer app", () => {
		const db = new DatabaseSync(":memory:");
		migrate(db, migrations);
		expect(() => migrate(db, migrations.slice(0, 1))).toThrow("newer");
	});
});

describe("event log", () => {
	it("stores events and reads them back in order after a sequence number", () => {
		let clock = 100;
		const log = createEventLog(
			openDatabase(":memory:"),
			coreEvent,
			() => clock++,
		);
		const first = log.append({ type: "core.started", pid: 1 });
		log.append({ type: "core.started", pid: 2 });
		expect(log.read()).toEqual([
			{ seq: first, at: 100, event: { type: "core.started", pid: 1 } },
			{ seq: first + 1, at: 101, event: { type: "core.started", pid: 2 } },
		]);
		expect(log.read({ after: first }).map(({ event }) => event)).toEqual([
			{ type: "core.started", pid: 2 },
		]);
	});

	it("rejects an event that breaks its schema, on write and on read", () => {
		const db = openDatabase(":memory:");
		const log = createEventLog(db, coreEvent);
		expect(() =>
			log.append(JSON.parse('{"type": "core.started", "pid": "x"}')),
		).toThrow();
		expect(log.read()).toEqual([]);

		const narrower = z.discriminatedUnion("type", [
			z.object({ type: z.literal("core.started"), pid: z.literal(1) }),
		]);
		log.append({ type: "core.started", pid: 2 });
		expect(() => createEventLog(db, narrower).read()).toThrow();
	});
});

describe("plugin store", () => {
	it("keeps values apart by plugin and worktree, and drops them with the worktree", () => {
		const db = openDatabase(":memory:");
		db.exec(`INSERT INTO projects VALUES ('p', '/r', 'r', 'main', 0);
			INSERT INTO worktrees VALUES ('a', 'p', 'main', '/r', 0, 0);`);
		const store = createPluginStore(db);
		const at = { plugin: "editor", worktree: "a", key: "tabs" };
		store.set(at, "first");
		store.set(at, "second");
		expect(store.get(at)).toBe("second");
		expect(store.get({ ...at, plugin: "files" })).toBeUndefined();
		store.set(at, null);
		expect(store.get(at)).toBeUndefined();
		store.set(at, "kept");
		db.exec("DELETE FROM worktrees WHERE id = 'a'");
		expect(store.get(at)).toBeUndefined();
	});
});

describe("layout store", () => {
	it("keeps the last layout saved for each worktree, and drops it with the worktree", () => {
		const db = openDatabase(":memory:");
		db.exec(`INSERT INTO projects VALUES ('p', '/r', 'r', 'main', 0);
			INSERT INTO worktrees VALUES ('a', 'p', 'main', '/r', 0, 0);
			INSERT INTO worktrees VALUES ('b', 'p', 'x', '/w/x', 1, 0);`);
		const layouts = createLayoutStore(db);
		expect(layouts.get("a")).toBeUndefined();
		layouts.save("a", "first");
		layouts.save("a", "second");
		layouts.save("b", "third");
		expect(layouts.get("a")).toBe("second");
		expect(layouts.get("b")).toBe("third");
		db.exec("DELETE FROM worktrees WHERE id = 'b'");
		expect(layouts.get("b")).toBeUndefined();
		expect(() => layouts.save("gone", "x")).toThrow();
	});
});
