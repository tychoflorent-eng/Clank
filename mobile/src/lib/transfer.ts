import { eq, inArray } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { db } from '@/db/client';
import { maintenanceRecords, mediaAttachments, ownershipEvents, vehicles } from '@/db/schema';
import { parseTasks } from '@/lib/maintenance-tasks';

export const TRANSFER_SCHEMA_VERSION = 4;

const BUNDLE_ENTRY = 'bundle.json';

export type BundleMedia = {
  kind: 'image' | 'video';
  mimeType: string;
  fileSize: number;
  // Entry name inside the zip, e.g. "media/12.jpg".
  bundlePath: string;
};

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
    media: BundleMedia[] | null;
  }[];
  ownershipEvents: {
    type: 'added' | 'imported' | 'transferred_out';
    occurredAt: string;
    note: string | null;
  }[];
};

export type TransferExport = {
  bundle: VehicleTransferBundle;
  // Media files to pack next to bundle.json, keyed by bundlePath.
  mediaFiles: { bundlePath: string; uri: string }[];
};

export function buildTransferExport(vehicleId: number): TransferExport {
  const vehicle = db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();
  if (!vehicle) {
    throw new Error('Vehicle not found.');
  }

  const records = db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.vehicleId, vehicleId))
    .all();

  const attachments =
    records.length > 0
      ? db
          .select()
          .from(mediaAttachments)
          .where(
            inArray(
              mediaAttachments.recordId,
              records.map((record) => record.id),
            ),
          )
          .all()
      : [];

  const events = db
    .select()
    .from(ownershipEvents)
    .where(eq(ownershipEvents.vehicleId, vehicleId))
    .all();

  const mediaFiles: TransferExport['mediaFiles'] = [];

  const bundle: VehicleTransferBundle = {
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
    maintenanceRecords: records.map((record) => {
      const recordMedia = attachments
        .filter((attachment) => attachment.recordId === record.id)
        .map((attachment) => {
          const extension = attachment.filePath.slice(attachment.filePath.lastIndexOf('.'));
          const bundlePath = `media/${attachment.id}${extension}`;
          mediaFiles.push({
            bundlePath,
            uri: new File(Paths.document, attachment.filePath).uri,
          });
          return {
            kind: attachment.kind,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            bundlePath,
          };
        });

      const tasks = parseTasks(record.tasks);
      return {
        date: record.date,
        time: record.time,
        mileage: record.mileage,
        type: record.type,
        tasks: tasks.length > 0 ? tasks : null,
        partNumber: record.partNumber,
        description: record.description,
        performedBy: record.performedBy,
        cost: record.cost,
        createdAt: record.createdAt,
        media: recordMedia.length > 0 ? recordMedia : null,
      };
    }),
    ownershipEvents: events.map((event) => ({
      type: event.type,
      occurredAt: event.occurredAt,
      note: event.note,
    })),
  };

  return { bundle, mediaFiles };
}

// Kept for callers that only need the metadata (QR transfer).
export function buildTransferBundle(vehicleId: number): VehicleTransferBundle {
  return buildTransferExport(vehicleId).bundle;
}

function slugFor(vehicle: VehicleTransferBundle['vehicle']) {
  const base = (vehicle.nickname || `${vehicle.make}-${vehicle.model}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'vehicle';
}

export async function writeTransferFile(transferExport: TransferExport): Promise<File> {
  const { bundle, mediaFiles } = transferExport;

  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {
    [BUNDLE_ENTRY]: [strToU8(JSON.stringify(bundle, null, 2)), { level: 6 }],
  };
  for (const media of mediaFiles) {
    // Photos are already JPEG and videos already H.264 — deflating them again
    // wastes time for ~0 gain, so they're stored uncompressed in the zip.
    entries[media.bundlePath] = [await new File(media.uri).bytes(), { level: 0 }];
  }

  const zipped = zipSync(entries);

  const file = new File(Paths.cache, `${slugFor(bundle.vehicle)}.clank.zip`);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(zipped);
  return file;
}

export type ParsedTransferFile = {
  bundle: VehicleTransferBundle;
  // Media bytes keyed by bundlePath; empty for legacy JSON files.
  mediaFiles: Map<string, Uint8Array>;
};

export function parseTransferFile(bytes: Uint8Array): ParsedTransferFile {
  // Zip files start with "PK"; anything else is treated as a legacy JSON export.
  if (bytes.length > 1 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const entries = unzipSync(bytes);
    const bundleEntry = entries[BUNDLE_ENTRY];
    if (!bundleEntry) {
      throw new Error('This file is not a valid Clank maintenance history export.');
    }
    const bundle = parseTransferBundle(strFromU8(bundleEntry));
    const mediaFiles = new Map<string, Uint8Array>();
    for (const [name, data] of Object.entries(entries)) {
      if (name !== BUNDLE_ENTRY) {
        mediaFiles.set(name, data);
      }
    }
    return { bundle, mediaFiles };
  }

  return { bundle: parseTransferBundle(strFromU8(bytes)), mediaFiles: new Map() };
}

export function parseTransferBundle(contents: string): VehicleTransferBundle {
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.schemaVersion !== 'number') {
    throw new Error('This file is not a valid Clank maintenance history export.');
  }

  // v1 bundles predate the vehicle generalization: the vehicle lived under a
  // `motorcycle` key and had no type. Records from that era also lack the
  // time/partNumber/tasks/media fields, which the nullable columns absorb.
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
