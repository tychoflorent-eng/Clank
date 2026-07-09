import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { maintenanceRecords, mediaAttachments, ownershipEvents, vehicles } from '@/db/schema';
import { MEDIA_DIR_NAME } from '@/lib/media';
import { decodeTransferQr } from '@/lib/qr-transfer';
import { parseTransferFile, type VehicleTransferBundle } from '@/lib/transfer';

export default function ImportVehicleScreen() {
  const [bundle, setBundle] = useState<VehicleTransferBundle | null>(null);
  // Media bytes from a zip export, keyed by bundlePath; kept until import.
  const mediaFilesRef = useRef<Map<string, Uint8Array>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  // onBarcodeScanned keeps firing every frame; only handle the first hit.
  const handledScanRef = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  const handleChooseFile = async () => {
    setError(null);
    setScanning(false);
    try {
      const picked = await File.pickFileAsync({
        mimeTypes: ['application/json', 'application/zip', '*/*'],
      });
      if (picked.canceled) return;
      const parsed = parseTransferFile(await picked.result.bytes());
      mediaFilesRef.current = parsed.mediaFiles;
      setBundle(parsed.bundle);
    } catch (err) {
      setBundle(null);
      mediaFilesRef.current = new Map();
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStartScan = async () => {
    setError(null);
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        setError('Camera permission is needed to scan a QR code.');
        return;
      }
    }
    handledScanRef.current = false;
    setBundle(null);
    setScanning(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (handledScanRef.current) return;
    handledScanRef.current = true;
    setScanning(false);
    try {
      setBundle(decodeTransferQr(data));
      mediaFilesRef.current = new Map();
    } catch (err) {
      setBundle(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImport = () => {
    if (!bundle) return;

    // Write media files out first so the DB rows only ever point at files
    // that exist; on failure, orphaned files are harmless.
    const mediaDir = new Directory(Paths.document, MEDIA_DIR_NAME);
    const writtenByBundlePath = new Map<string, { filePath: string; fileSize: number }>();
    if (mediaFilesRef.current.size > 0) {
      mediaDir.create({ intermediates: true, idempotent: true });
      for (const [bundlePath, bytes] of mediaFilesRef.current) {
        const extension = bundlePath.slice(bundlePath.lastIndexOf('.'));
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
        const target = new File(mediaDir, name);
        target.create();
        target.write(bytes);
        writtenByBundlePath.set(bundlePath, {
          filePath: `${MEDIA_DIR_NAME}/${name}`,
          fileSize: bytes.byteLength,
        });
      }
    }

    const vehicle = db.transaction((tx) => {
      const inserted = tx
        .insert(vehicles)
        .values({
          type: bundle.vehicle.type,
          make: bundle.vehicle.make,
          model: bundle.vehicle.model,
          year: bundle.vehicle.year,
          nickname: bundle.vehicle.nickname,
          vin: bundle.vehicle.vin,
          plate: bundle.vehicle.plate,
          color: bundle.vehicle.color,
          mileage: bundle.vehicle.mileage,
          notes: bundle.vehicle.notes,
          createdAt: bundle.vehicle.createdAt,
        })
        .returning()
        .get();

      for (const record of bundle.maintenanceRecords) {
        const { media, ...recordFields } = record;
        const insertedRecord = tx
          .insert(maintenanceRecords)
          .values({
            ...recordFields,
            vehicleId: inserted.id,
            // The bundle carries tasks as an array; the column stores JSON text.
            tasks:
              Array.isArray(record.tasks) && record.tasks.length > 0
                ? JSON.stringify(record.tasks)
                : null,
          })
          .returning()
          .get();

        for (const item of media ?? []) {
          const written = writtenByBundlePath.get(item.bundlePath);
          if (!written) continue; // QR imports and hand-trimmed zips
          tx.insert(mediaAttachments)
            .values({
              recordId: insertedRecord.id,
              kind: item.kind === 'video' ? 'video' : 'image',
              filePath: written.filePath,
              mimeType: item.mimeType,
              fileSize: written.fileSize,
            })
            .run();
        }
      }

      for (const event of bundle.ownershipEvents) {
        tx.insert(ownershipEvents)
          .values({ vehicleId: inserted.id, ...event })
          .run();
      }

      tx.insert(ownershipEvents).values({ vehicleId: inserted.id, type: 'imported' }).run();

      return inserted;
    });

    router.replace(`/vehicle/${vehicle.id}`);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Import vehicle' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText themeColor="textSecondary">
            Scan the QR code on the previous owner&apos;s phone, or choose a maintenance history
            file they shared with you, to add their vehicle to your garage with its full history.
          </ThemedText>

          <ThemedView style={styles.buttonRow}>
            <Pressable
              onPress={scanning ? () => setScanning(false) : handleStartScan}
              style={({ pressed }) => [styles.buttonRowItem, pressed && styles.pressed]}>
              <ThemedView
                type={scanning ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.chooseButton}>
                <ThemedText type="smallBold">
                  {scanning ? 'Stop scanning' : 'Scan QR code'}
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable
              onPress={handleChooseFile}
              style={({ pressed }) => [styles.buttonRowItem, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.chooseButton}>
                <ThemedText type="smallBold">Choose file</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>

          {scanning && (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          )}

          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          {bundle && (
            <ThemedView type="backgroundElement" style={styles.previewCard}>
              <ThemedText type="smallBold">
                {bundle.vehicle.nickname || `${bundle.vehicle.make} ${bundle.vehicle.model}`}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {bundle.vehicle.year} {bundle.vehicle.make} {bundle.vehicle.model}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {bundle.maintenanceRecords.length} maintenance record
                {bundle.maintenanceRecords.length === 1 ? '' : 's'}
                {mediaFilesRef.current.size > 0
                  ? ` · ${mediaFilesRef.current.size} photo/video file${
                      mediaFilesRef.current.size === 1 ? '' : 's'
                    }`
                  : ''}
              </ThemedText>

              <Pressable
                onPress={handleImport}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundSelected" style={styles.importButton}>
                  <ThemedText type="smallBold">Add to my garage</ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  buttonRowItem: { flex: 1 },
  chooseButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  camera: {
    height: 320,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  previewCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  importButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
});
