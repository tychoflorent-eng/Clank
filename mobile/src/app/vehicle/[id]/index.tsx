import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransferQrModal } from '@/components/transfer-qr-modal';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { maintenanceRecords, mediaAttachments, ownershipEvents, vehicles } from '@/db/schema';
import { parseTasks } from '@/lib/maintenance-tasks';
import { mediaUri } from '@/lib/media';
import { encodeTransferQr } from '@/lib/qr-transfer';
import { buildTransferBundle, buildTransferExport, writeTransferFile } from '@/lib/transfer';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const [taskFilter, setTaskFilter] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrHasMedia, setQrHasMedia] = useState(false);

  const { data: vehicleRows, updatedAt } = useLiveQuery(
    db.select().from(vehicles).where(eq(vehicles.id, vehicleId)),
    [vehicleId],
  );
  const vehicle = vehicleRows[0];

  const { data: records } = useLiveQuery(
    db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.vehicleId, vehicleId))
      .orderBy(
        desc(maintenanceRecords.date),
        desc(maintenanceRecords.time),
        desc(maintenanceRecords.id),
      ),
    [vehicleId],
  );

  const { data: attachmentRows } = useLiveQuery(
    db
      .select({
        id: mediaAttachments.id,
        recordId: mediaAttachments.recordId,
        kind: mediaAttachments.kind,
        filePath: mediaAttachments.filePath,
      })
      .from(mediaAttachments)
      .innerJoin(maintenanceRecords, eq(mediaAttachments.recordId, maintenanceRecords.id))
      .where(eq(maintenanceRecords.vehicleId, vehicleId)),
    [vehicleId],
  );

  if (!vehicle) {
    // The live query hasn't produced its first result yet — don't flash
    // "not found" while the row is still loading.
    if (updatedAt === undefined) {
      return <ThemedView style={styles.container} />;
    }
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Vehicle not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isArchived = vehicle.status === 'archived';

  // Records are sorted newest-first, so the first filtered match is the most
  // recent time that task was done.
  const filterOptions = Array.from(
    new Set(
      records.flatMap((record) => [
        ...parseTasks(record.tasks),
        ...(record.type ? [record.type] : []),
      ]),
    ),
  ).sort();
  const filteredRecords = taskFilter
    ? records.filter(
        (record) => parseTasks(record.tasks).includes(taskFilter) || record.type === taskFilter,
      )
    : records;
  const lastDone = taskFilter ? filteredRecords[0] : undefined;
  const totalCost = filteredRecords.reduce((sum, record) => sum + (record.cost ?? 0), 0);

  const archiveVehicle = () => {
    const now = new Date().toISOString();
    db.update(vehicles)
      .set({ status: 'archived', archivedAt: now, updatedAt: now })
      .where(eq(vehicles.id, vehicleId))
      .run();
    db.insert(ownershipEvents).values({ vehicleId, type: 'transferred_out' }).run();
    router.back();
  };

  const handleTransferOut = () => {
    Alert.alert(
      'No longer own this vehicle?',
      'It will move to Past vehicles and its history is kept. You can send the history file to the new owner now — they import it in their own Clank to keep the log going.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move only', onPress: archiveVehicle },
        {
          text: 'Send file & move',
          onPress: async () => {
            if (await shareHistory()) {
              archiveVehicle();
            }
          },
        },
      ],
    );
  };

  const handleRestore = () => {
    db.update(vehicles)
      .set({ status: 'active', archivedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(vehicles.id, vehicleId))
      .run();
  };

  const shareHistory = async (): Promise<boolean> => {
    try {
      const transferExport = buildTransferExport(vehicleId);
      const file = await writeTransferFile(transferExport);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot share files.');
        return false;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/zip',
        dialogTitle: 'Share maintenance history',
      });
      return true;
    } catch (err) {
      Alert.alert('Could not export', err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const handleShare = () => {
    void shareHistory();
  };

  const handleShowQr = () => {
    try {
      const bundle = buildTransferBundle(vehicleId);
      setQrHasMedia(
        bundle.maintenanceRecords.some((record) => record.media && record.media.length > 0),
      );
      setQrPayload(encodeTransferQr(bundle));
      setQrVisible(true);
    } catch (err) {
      Alert.alert('Could not export', err instanceof Error ? err.message : String(err));
    }
  };

  const handleFindParts = () => {
    router.push({
      pathname: '/(tabs)/model-search',
      params: { make: vehicle.make, model: vehicle.model, type: vehicle.type },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: vehicle.nickname || `${vehicle.make} ${vehicle.model}` }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.infoCard}>
            <ThemedView style={styles.titleRow}>
              <ThemedText type="title" style={styles.vehicleTitle}>
                {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.typeBadge}>
                <ThemedText type="small">
                  {vehicle.type === 'car' ? 'Car' : 'Motorcycle'}
                </ThemedText>
              </ThemedView>
              {isArchived && (
                <ThemedView type="backgroundElement" style={styles.typeBadge}>
                  <ThemedText type="small">Transferred out</ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            <ThemedText themeColor="textSecondary">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </ThemedText>
            {vehicle.mileage != null && (
              <ThemedText themeColor="textSecondary">
                {vehicle.mileage.toLocaleString()} mi
              </ThemedText>
            )}
            {vehicle.vin && <ThemedText themeColor="textSecondary">VIN: {vehicle.vin}</ThemedText>}
            {vehicle.plate && (
              <ThemedText themeColor="textSecondary">Plate: {vehicle.plate}</ThemedText>
            )}
            {vehicle.color && (
              <ThemedText themeColor="textSecondary">Color: {vehicle.color}</ThemedText>
            )}
            {vehicle.notes && <ThemedText themeColor="textSecondary">{vehicle.notes}</ThemedText>}

            <ThemedView style={styles.actionsRow}>
              {!isArchived && (
                <Pressable
                  onPress={() => router.push(`/vehicle/${vehicleId}/edit`)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundSelected" style={styles.actionButton}>
                    <ThemedText type="smallBold">Edit</ThemedText>
                  </ThemedView>
                </Pressable>
              )}
              <Pressable
                onPress={handleFindParts}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.actionButton}>
                  <ThemedText type="smallBold">Find parts</ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable onPress={handleShare} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.actionButton}>
                  <ThemedText type="smallBold">Share history</ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable onPress={handleShowQr} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.actionButton}>
                  <ThemedText type="smallBold">QR transfer</ThemedText>
                </ThemedView>
              </Pressable>
              {isArchived ? (
                <Pressable
                  onPress={handleRestore}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.actionButton}>
                    <ThemedText type="smallBold">Return to garage</ThemedText>
                  </ThemedView>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleTransferOut}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.actionButton}>
                    <ThemedText type="smallBold">No longer own this vehicle</ThemedText>
                  </ThemedView>
                </Pressable>
              )}
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Maintenance log
              </ThemedText>
              {!isArchived && (
                <Pressable
                  onPress={() => router.push(`/vehicle/${vehicleId}/maintenance/new`)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.addButton}>
                    <ThemedText type="smallBold">Add</ThemedText>
                  </ThemedView>
                </Pressable>
              )}
            </ThemedView>

            {filterOptions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}>
                <Pressable
                  onPress={() => setTaskFilter(null)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView
                    type={taskFilter === null ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.filterChip}>
                    <ThemedText type="small">All</ThemedText>
                  </ThemedView>
                </Pressable>
                {filterOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setTaskFilter(taskFilter === option ? null : option)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView
                      type={taskFilter === option ? 'backgroundSelected' : 'backgroundElement'}
                      style={styles.filterChip}>
                      <ThemedText type="small">{option}</ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {taskFilter &&
              (lastDone ? (
                <ThemedText themeColor="textSecondary">
                  Last done: {lastDone.date}
                  {lastDone.time ? ` ${lastDone.time}` : ''}
                  {lastDone.mileage != null
                    ? ` · ${lastDone.mileage.toLocaleString()} mi`
                    : ''}
                </ThemedText>
              ) : (
                <ThemedText themeColor="textSecondary">Never logged.</ThemedText>
              ))}

            {records.length === 0 ? (
              <ThemedText themeColor="textSecondary">No maintenance records yet.</ThemedText>
            ) : (
              <ThemedText themeColor="textSecondary">
                {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}
                {totalCost > 0 ? ` · $${totalCost.toFixed(2)} total` : ''}
              </ThemedText>
            )}

            {filteredRecords.map((record) => {
              const recordTasks = parseTasks(record.tasks);
              const recordMedia = attachmentRows.filter(
                (attachment) => attachment.recordId === record.id,
              );
              return (
                <Pressable
                  key={record.id}
                  onPress={() => router.push(`/vehicle/${vehicleId}/maintenance/${record.id}`)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.recordCard}>
                    <ThemedText type="smallBold">
                      {record.type || recordTasks.join(', ')}
                    </ThemedText>
                    {record.type !== '' && recordTasks.length > 0 && (
                      <ThemedText themeColor="textSecondary">
                        Tasks: {recordTasks.join(', ')}
                      </ThemedText>
                    )}
                    <ThemedText themeColor="textSecondary">
                      {record.date}
                      {record.time ? ` ${record.time}` : ''}
                      {record.mileage != null ? ` · ${record.mileage.toLocaleString()} mi` : ''}
                      {record.cost != null ? ` · $${record.cost.toFixed(2)}` : ''}
                    </ThemedText>
                    {record.partNumber && (
                      <ThemedText themeColor="textSecondary">
                        Part #: {record.partNumber}
                      </ThemedText>
                    )}
                    {record.description && (
                      <ThemedText themeColor="textSecondary">{record.description}</ThemedText>
                    )}
                    {recordMedia.length > 0 && (
                      <ThemedView style={styles.mediaRow}>
                        {recordMedia.slice(0, 4).map((attachment) =>
                          attachment.kind === 'image' ? (
                            <Image
                              key={attachment.id}
                              source={{ uri: mediaUri(attachment.filePath) }}
                              style={styles.mediaThumb}
                              contentFit="cover"
                            />
                          ) : (
                            <ThemedView key={attachment.id} style={styles.videoThumb}>
                              <ThemedText type="small" style={styles.videoThumbLabel}>
                                ▶
                              </ThemedText>
                            </ThemedView>
                          ),
                        )}
                        {recordMedia.length > 4 && (
                          <ThemedText type="small" themeColor="textSecondary">
                            +{recordMedia.length - 4}
                          </ThemedText>
                        )}
                      </ThemedView>
                    )}
                  </ThemedView>
                </Pressable>
              );
            })}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>

      <TransferQrModal
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        payload={qrPayload}
        vehicleName={vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
        hasMedia={qrHasMedia}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.four,
    gap: Spacing.four,
  },
  infoCard: { gap: Spacing.one },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  vehicleTitle: { fontSize: 28, lineHeight: 34 },
  typeBadge: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  section: { gap: Spacing.two },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 22, lineHeight: 28 },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filterChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  addButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  recordCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
    backgroundColor: 'transparent',
  },
  mediaThumb: {
    width: 48,
    height: 48,
    borderRadius: Spacing.one,
  },
  videoThumb: {
    width: 48,
    height: 48,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
  },
  videoThumbLabel: { color: '#fff' },
});
