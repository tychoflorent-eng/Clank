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
import { maintenanceRecords, motorcycles, ownershipEvents } from '@/db/schema';
import { buildTransferBundle, writeTransferFile } from '@/lib/transfer';

export default function MotorcycleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const motorcycleId = Number(id);

  const { data: bikes } = useLiveQuery(
    db.select().from(motorcycles).where(eq(motorcycles.id, motorcycleId)),
    [motorcycleId],
  );
  const bike = bikes[0];

  const { data: records } = useLiveQuery(
    db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.motorcycleId, motorcycleId))
      .orderBy(desc(maintenanceRecords.date)),
    [motorcycleId],
  );

  if (!bike) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Motorcycle not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleTransferOut = () => {
    const now = new Date().toISOString();
    db.update(motorcycles)
      .set({ status: 'archived', archivedAt: now, updatedAt: now })
      .where(eq(motorcycles.id, motorcycleId))
      .run();
    db.insert(ownershipEvents).values({ motorcycleId, type: 'transferred_out' }).run();
    router.back();
  };

  const handleShare = async () => {
    try {
      const bundle = buildTransferBundle(motorcycleId);
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
      <Stack.Screen options={{ title: bike.nickname || `${bike.make} ${bike.model}` }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.infoCard}>
            <ThemedText type="title" style={styles.bikeTitle}>
              {bike.nickname || `${bike.make} ${bike.model}`}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {bike.year} {bike.make} {bike.model}
            </ThemedText>
            {bike.mileage != null && (
              <ThemedText themeColor="textSecondary">
                {bike.mileage.toLocaleString()} mi
              </ThemedText>
            )}
            {bike.vin && <ThemedText themeColor="textSecondary">VIN: {bike.vin}</ThemedText>}
            {bike.plate && <ThemedText themeColor="textSecondary">Plate: {bike.plate}</ThemedText>}
            {bike.color && <ThemedText themeColor="textSecondary">Color: {bike.color}</ThemedText>}
            {bike.notes && <ThemedText themeColor="textSecondary">{bike.notes}</ThemedText>}

            <ThemedView style={styles.actionsRow}>
              <Pressable
                onPress={() => router.push(`/motorcycle/${motorcycleId}/edit`)}
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
                  <ThemedText type="smallBold">No longer own this bike</ThemedText>
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
                onPress={() => router.push(`/motorcycle/${motorcycleId}/maintenance/new`)}
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
                  {record.mileage != null ? ` · ${record.mileage.toLocaleString()} mi` : ''}
                  {record.cost != null ? ` · $${record.cost.toFixed(2)}` : ''}
                </ThemedText>
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
  bikeTitle: { fontSize: 28, lineHeight: 34 },
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
