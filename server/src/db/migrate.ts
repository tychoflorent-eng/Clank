import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { db } from "./client.js";

migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, "migrations") });
console.log("Migrations applied.");
