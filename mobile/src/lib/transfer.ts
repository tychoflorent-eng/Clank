import { eq } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import { maintenanceRecords, ownershipEvents, vehicles } from '@/db/schema';
import { parseTasks } from '@/lib/maintenance-tasks';

export const TRANSFER_SCHEMA_VERSION = 3;

export type VehicleTransferBundle = {
  schemaVersion: number;
  exportedAt: string;
  vehicle: {
    type: 'motorcycle' | 'car';
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
    time: string | null;
    mileage: number | null;
    type: string;
    // Exported as a plain array for readability; stored as a JSON string column.
    tasks: string[] | null;
    partNumber: string | null;
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

export function buildTransferBundle(vehicleId: number): VehicleTransferBundle {
  const vehicle = db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();
  if (!vehicle) {
    throw new Error('Vehicle not found.');
  }

  const records = db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.vehicleId, vehicleId))
    .all();

  const events = db
    .select()
    .from(ownershipEvents)
    .where(eq(ownershipEvents.vehicleId, vehicleId))
    .all();

  return {
    schemaVersion: TRANSFER_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    vehicle: {
      type: vehicle.type,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      nickname: vehicle.nickname,
      vin: vehicle.vin,
      plate: vehicle.plate,
      color: vehicle.color,
      mileage: vehicle.mileage,
      notes: vehicle.notes,
      createdAt: vehicle.createdAt,
    },
    maintenanceRecords: records.map((record) => ({
      date: record.date,
      time: record.time,
      mileage: record.mileage,
      type: record.type,
      tasks: record.tasks ? parseTasks(record.tasks) : null,
      partNumber: record.partNumber,
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

function slugFor(vehicle: VehicleTransferBundle['vehicle']) {
  const base = (vehicle.nickname || `${vehicle.make}-${vehicle.model}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'vehicle';
}

export function writeTransferFile(bundle: VehicleTransferBundle): File {
  const file = new File(Paths.cache, `${slugFor(bundle.vehicle)}.clank.json`);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(JSON.stringify(bundle, null, 2));
  return file;
}

export function parseTransferBundle(contents: string): VehicleTransferBundle {
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.schemaVersion !== 'number') {
    throw new Error('This file is not a valid Clank maintenance history export.');
  }

  // v1 bundles predate the vehicle generalization: the vehicle lived under a
  // `motorcycle` key and had no type. Records from that era also lack the
  // time/partNumber fields, which the nullable columns absorb on insert.
  if (!parsed.vehicle && parsed.motorcycle && typeof parsed.motorcycle === 'object') {
    parsed.vehicle = { type: 'motorcycle', ...parsed.motorcycle };
  }

  if (
    !parsed.vehicle ||
    typeof parsed.vehicle !== 'object' ||
    !Array.isArray(parsed.maintenanceRecords) ||
    !Array.isArray(parsed.ownershipEvents)
  ) {
    throw new Error('This file is not a valid Clank maintenance history export.');
  }

  if (parsed.vehicle.type !== 'car' && parsed.vehicle.type !== 'motorcycle') {
    parsed.vehicle.type = 'motorcycle';
  }

  return parsed as VehicleTransferBundle;
}
