import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['motorcycle', 'car'] }).notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  nickname: text('nickname'),
  vin: text('vin'),
  plate: text('plate'),
  color: text('color'),
  mileage: integer('mileage'),
  notes: text('notes'),
  // 'archived' means this vehicle was transferred to a new owner but the log is kept for history.
  status: text('status', { enum: ['active', 'archived'] })
    .notNull()
    .default('active'),
  archivedAt: text('archived_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const maintenanceRecords = sqliteTable('maintenance_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  time: text('time'),
  mileage: integer('mileage'),
  type: text('type').notNull(),
  // JSON string array of quick-pick tasks, e.g. '["Oil change","Tire rotation"]'.
  tasks: text('tasks'),
  partNumber: text('part_number'),
  description: text('description'),
  performedBy: text('performed_by'),
  cost: real('cost'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const mediaAttachments = sqliteTable('media_attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recordId: integer('record_id')
    .notNull()
    .references(() => maintenanceRecords.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['image', 'video'] }).notNull(),
  // Path relative to the app document directory, e.g. "media/1720000000-ab12cd34.jpg".
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const diagrams = sqliteTable('diagrams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  fileName: text('file_name').notNull(),
  // Path relative to the app's document directory, e.g. "diagrams/<uuid>.png".
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedAt: text('uploaded_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// A provenance log for a vehicle's ownership chain. Since there are no accounts or a server,
// this travels inside the export/transfer bundle so a new owner's app can show the vehicle's
// full history rather than just what happened since they imported it.
export const ownershipEvents = sqliteTable('ownership_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['added', 'imported', 'transferred_out'] }).notNull(),
  occurredAt: text('occurred_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  note: text('note'),
});
