import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema.js";

const dataDir = process.env.DATA_DIR ?? path.resolve(import.meta.dirname, "../../../data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "clank.sqlite");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Applied on every boot so a fresh container/checkout never needs a manual
// migrate step; drizzle tracks what's already applied and no-ops the rest.
migrate(db, { migrationsFolder: path.join(import.meta.dirname, "migrations") });

export const diagramsDir = path.join(dataDir, "diagrams");
fs.mkdirSync(diagramsDir, { recursive: true });
