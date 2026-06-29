import { eq } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import { maintenanceRecords, ownershipEvents, vehicles } from '@/db/schema';

export const TRANSFER_SCHEMA_VERSION = 2;

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
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.schemaVersion !== 'number' ||
    !parsed.vehicle ||
    !Array.isArray(parsed.maintenanceRecords) ||
    !Array.isArray(parsed.ownershipEvents)
  ) {
    throw new Error('This file is not a valid Clank maintenance history export.');
  }
  return parsed as VehicleTransferBundle;
}
