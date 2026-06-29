import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const motorcycles = sqliteTable("motorcycles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  nickname: text("nickname"),
  vin: text("vin"),
  plate: text("plate"),
  color: text("color"),
  mileage: integer("mileage"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const maintenanceRecords = sqliteTable("maintenance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  motorcycleId: integer("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  mileage: integer("mileage"),
  type: text("type").notNull(),
  description: text("description"),
  performedBy: text("performed_by"),
  cost: real("cost"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const diagrams = sqliteTable("diagrams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  motorcycleId: integer("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const specsCache = sqliteTable(
  "specs_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    provider: text("provider").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year"),
    dataJson: text("data_json").notNull(),
    fetchedAt: text("fetched_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    lookupIdx: uniqueIndex("specs_cache_lookup_idx").on(
      table.provider,
      table.make,
      table.model,
      table.year,
    ),
  }),
);
