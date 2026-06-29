import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { maintenanceRecords, ownershipEvents, vehicles } from '@/db/schema';
import { buildTransferBundle, writeTransferFile } from '@/lib/transfer';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const { data: vehicleRows } = useLiveQuery(
    db.select().from(vehicles).where(eq(vehicles.id, vehicleId)),
    [vehicleId],
  );
  const vehicle = vehicleRows[0];

  const { data: records } = useLiveQuery(
    db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.vehicleId, vehicleId))
      .orderBy(desc(maintenanceRecords.date)),
    [vehicleId],
  );

  if (!vehicle) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Vehicle not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleTransferOut = () => {
    const now = new Date().toISOString();
    db.update(vehicles)
      .set({ status: 'archived', archivedAt: now, updatedAt: now })
      .where(eq(vehicles.id, vehicleId))
      .run();
    db.insert(ownershipEvents).values({ vehicleId, type: 'transferred_out' }).run();
    router.back();
  };

  const handleShare = async () => {
    try {
      const bundle = buildTransferBundle(vehicleId);
      const file = writeTransferFile(bundle);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot share files.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Share maintenance history',
      });
    } catch (err) {
      Alert.alert('Could not export', err instanceof Error ? err.message : String(err));
    }
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
              <Pressable
                onPress={() => router.push(`/vehicle/${vehicleId}/edit`)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundSelected" style={styles.actionButton}>
                  <ThemedText type="smallBold">Edit</ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable onPress={handleShare} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.actionButton}>
                  <ThemedText type="smallBold">Share history</ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable
                onPress={handleTransferOut}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.actionButton}>
                  <ThemedText type="smallBold">No longer own this vehicle</ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Maintenance log
              </ThemedText>
              <Pressable
                onPress={() => router.push(`/vehicle/${vehicleId}/maintenance/new`)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.addButton}>
                  <ThemedText type="smallBold">Add</ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>

            {records.length === 0 && (
              <ThemedText themeColor="textSecondary">No maintenance records yet.</ThemedText>
            )}

            {records.map((record) => (
              <ThemedView key={record.id} type="backgroundElement" style={styles.recordCard}>
                <ThemedText type="smallBold">{record.type}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {record.date}
                  {record.time ? ` ${record.time}` : ''}
                  {record.mileage != null ? ` · ${record.mileage.toLocaleString()} mi` : ''}
                  {record.cost != null ? ` · $${record.cost.toFixed(2)}` : ''}
                </ThemedText>
                {record.partNumber && (
                  <ThemedText themeColor="textSecondary">Part #: {record.partNumber}</ThemedText>
                )}
                {record.description && (
                  <ThemedText themeColor="textSecondary">{record.description}</ThemedText>
                )}
              </ThemedView>
            ))}
          </ThemedView>
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
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.four,
    gap: Spacing.four,
  },
  infoCard: { gap: Spacing.one },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
