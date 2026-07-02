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
  const totalCost = records.reduce((sum, record) => sum + (record.cost ?? 0), 0);

  const handleTransferOut = () => {
    Alert.alert(
      'No longer own this vehicle?',
      'It will move to Past vehicles in your garage. Its history is kept and you can still share or restore it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to past vehicles',
          style: 'destructive',
          onPress: () => {
            const now = new Date().toISOString();
            db.update(vehicles)
              .set({ status: 'archived', archivedAt: now, updatedAt: now })
              .where(eq(vehicles.id, vehicleId))
              .run();
            db.insert(ownershipEvents).values({ vehicleId, type: 'transferred_out' }).run();
            router.back();
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

            {records.length === 0 ? (
              <ThemedText themeColor="textSecondary">No maintenance records yet.</ThemedText>
            ) : (
              <ThemedText themeColor="textSecondary">
                {records.length} record{records.length === 1 ? '' : 's'}
                {totalCost > 0 ? ` · $${totalCost.toFixed(2)} total` : ''}
              </ThemedText>
            )}

            {records.map((record) => (
              <Pressable
                key={record.id}
                onPress={() => router.push(`/vehicle/${vehicleId}/maintenance/${record.id}`)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.recordCard}>
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
              </Pressable>
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
