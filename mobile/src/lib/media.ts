import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { maintenanceRecords, mediaAttachments } from '@/db/schema';

// Images larger than this get resized down before saving; keeps attachments
// (and therefore transfer files) small without visibly hurting repair photos.
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.7;

export const MEDIA_DIR_NAME = 'media';

export type PickedMediaAsset = {
  uri: string;
  kind: 'image' | 'video';
  mimeType: string | null;
  width: number;
  height: number;
};

export function toPickedMedia(asset: ImagePickerAsset): PickedMediaAsset {
  return {
    uri: asset.uri,
    kind: asset.type === 'video' ? 'video' : 'image',
    mimeType: asset.mimeType ?? null,
    width: asset.width,
    height: asset.height,
  };
}

export function mediaUri(filePath: string): string {
  return new File(Paths.document, filePath).uri;
}

function ensureMediaDir(): Directory {
  const dir = new Directory(Paths.document, MEDIA_DIR_NAME);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function uniqueName(extension: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
}

function videoExtension(asset: PickedMediaAsset): string {
  if (asset.mimeType?.includes('quicktime')) return '.mov';
  const fromUri = asset.uri.match(/\.(mp4|mov|m4v|webm|3gp)$/i)?.[0];
  return fromUri?.toLowerCase() ?? '.mp4';
}

// Copies a picked asset into the app's media directory and returns the row
// values for media_attachments. Images are resized/recompressed; videos are
// stored as picked (no video transcoder is available in Expo Go).
export async function persistPickedMedia(
  asset: PickedMediaAsset,
): Promise<{ kind: 'image' | 'video'; filePath: string; mimeType: string; fileSize: number }> {
  const dir = ensureMediaDir();

  if (asset.kind === 'image') {
    const context = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > MAX_IMAGE_DIMENSION) {
      context.resize(
        asset.width >= asset.height
          ? { width: MAX_IMAGE_DIMENSION }
          : { height: MAX_IMAGE_DIMENSION },
      );
    }
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({
      compress: IMAGE_QUALITY,
      format: SaveFormat.JPEG,
    });

    const target = new File(dir, uniqueName('.jpg'));
    await new File(compressed.uri).move(target);
    return {
      kind: 'image',
      filePath: `${MEDIA_DIR_NAME}/${target.name}`,
      mimeType: 'image/jpeg',
      fileSize: target.size ?? 0,
    };
  }

  const target = new File(dir, uniqueName(videoExtension(asset)));
  await new File(asset.uri).copy(target);
  return {
    kind: 'video',
    filePath: `${MEDIA_DIR_NAME}/${target.name}`,
    mimeType: asset.mimeType ?? 'video/mp4',
    fileSize: target.size ?? 0,
  };
}

export async function addAttachmentsToRecord(recordId: number, assets: PickedMediaAsset[]) {
  for (const asset of assets) {
    const saved = await persistPickedMedia(asset);
    db.insert(mediaAttachments)
      .values({ recordId, ...saved })
      .run();
  }
}

function deleteFileQuietly(filePath: string) {
  try {
    const file = new File(Paths.document, filePath);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // A missing file must never block deleting the database row.
  }
}

export function deleteAttachment(attachmentId: number) {
  const row = db
    .select()
    .from(mediaAttachments)
    .where(eq(mediaAttachments.id, attachmentId))
    .get();
  if (!row) return;
  deleteFileQuietly(row.filePath);
  db.delete(mediaAttachments).where(eq(mediaAttachments.id, attachmentId)).run();
}

// Removes attachment files for records that are about to go away. The rows
// themselves cascade with the record/vehicle delete.
export function deleteAttachmentFilesForRecords(recordIds: number[]) {
  if (recordIds.length === 0) return;
  const rows = db
    .select()
    .from(mediaAttachments)
    .where(inArray(mediaAttachments.recordId, recordIds))
    .all();
  for (const row of rows) {
    deleteFileQuietly(row.filePath);
  }
}

export function deleteAttachmentFilesForVehicle(vehicleId: number) {
  const records = db
    .select({ id: maintenanceRecords.id })
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.vehicleId, vehicleId))
    .all();
  deleteAttachmentFilesForRecords(records.map((record) => record.id));
}
