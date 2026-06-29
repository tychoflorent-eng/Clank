import { eq } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import { maintenanceRecords, motorcycles, ownershipEvents } from '@/db/schema';

export const TRANSFER_SCHEMA_VERSION = 1;

export type MotorcycleTransferBundle = {
  schemaVersion: number;
  exportedAt: string;
  motorcycle: {
    make: string;
    model: string;
    year: number;
    nickname: string | null;
    vin: string | null;
    plate: string | null;
    color: string | null;
    mileage: number | null;
    notes: string | null;
    createdAt: string;
  };
  maintenanceRecords: {
    date: string;
    mileage: number | null;
    type: string;
    description: string | null;
    performedBy: string | null;
    cost: number | null;
    createdAt: string;
  }[];
  ownershipEvents: {
    type: 'added' | 'imported' | 'transferred_out';
    occurredAt: string;
    note: string | null;
  }[];
};

export function buildTransferBundle(motorcycleId: number): MotorcycleTransferBundle {
  const bike = db.select().from(motorcycles).where(eq(motorcycles.id, motorcycleId)).get();
  if (!bike) {
    throw new Error('Motorcycle not found.');
  }

  const records = db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.motorcycleId, motorcycleId))
    .all();

  const events = db
    .select()
    .from(ownershipEvents)
    .where(eq(ownershipEvents.motorcycleId, motorcycleId))
    .all();

  return {
    schemaVersion: TRANSFER_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    motorcycle: {
      make: bike.make,
      model: bike.model,
      year: bike.year,
      nickname: bike.nickname,
      vin: bike.vin,
      plate: bike.plate,
      color: bike.color,
      mileage: bike.mileage,
      notes: bike.notes,
      createdAt: bike.createdAt,
    },
    maintenanceRecords: records.map((record) => ({
      date: record.date,
      mileage: record.mileage,
      type: record.type,
      description: record.description,
      performedBy: record.performedBy,
      cost: record.cost,
      createdAt: record.createdAt,
    })),
    ownershipEvents: events.map((event) => ({
      type: event.type,
      occurredAt: event.occurredAt,
      note: event.note,
    })),
  };
}

function slugFor(bike: MotorcycleTransferBundle['motorcycle']) {
  const base = (bike.nickname || `${bike.make}-${bike.model}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'motorcycle';
}

export function writeTransferFile(bundle: MotorcycleTransferBundle): File {
  const file = new File(Paths.cache, `${slugFor(bundle.motorcycle)}.clank.json`);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(JSON.stringify(bundle, null, 2));
  return file;
}

export function parseTransferBundle(contents: string): MotorcycleTransferBundle {
  const parsed = JSON.parse(contents);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.schemaVersion !== 'number' ||
    !parsed.motorcycle ||
    !Array.isArray(parsed.maintenanceRecords) ||
    !Array.isArray(parsed.ownershipEvents)
  ) {
    throw new Error('This file is not a valid Clank maintenance history export.');
  }
  return parsed as MotorcycleTransferBundle;
}
