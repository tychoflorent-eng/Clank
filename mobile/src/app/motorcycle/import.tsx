import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { maintenanceRecords, motorcycles, ownershipEvents } from '@/db/schema';
import { type MotorcycleTransferBundle, parseTransferBundle } from '@/lib/transfer';

export default function ImportMotorcycleScreen() {
  const [bundle, setBundle] = useState<MotorcycleTransferBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChooseFile = async () => {
    setError(null);
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json', '*/*'] });
      if (picked.canceled) return;
      const contents = await picked.result.text();
      setBundle(parseTransferBundle(contents));
    } catch (err) {
      setBundle(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImport = () => {
    if (!bundle) return;

    const bike = db.transaction((tx) => {
      const inserted = tx
        .insert(motorcycles)
        .values({
          make: bundle.motorcycle.make,
          model: bundle.motorcycle.model,
          year: bundle.motorcycle.year,
          nickname: bundle.motorcycle.nickname,
          vin: bundle.motorcycle.vin,
          plate: bundle.motorcycle.plate,
          color: bundle.motorcycle.color,
          mileage: bundle.motorcycle.mileage,
          notes: bundle.motorcycle.notes,
          createdAt: bundle.motorcycle.createdAt,
        })
        .returning()
        .get();

      for (const record of bundle.maintenanceRecords) {
        tx.insert(maintenanceRecords)
          .values({ motorcycleId: inserted.id, ...record })
          .run();
      }

      for (const event of bundle.ownershipEvents) {
        tx.insert(ownershipEvents)
          .values({ motorcycleId: inserted.id, ...event })
          .run();
      }

      tx.insert(ownershipEvents).values({ motorcycleId: inserted.id, type: 'imported' }).run();

      return inserted;
    });

    router.replace(`/motorcycle/${bike.id}`);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Import motorcycle' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText themeColor="textSecondary">
            Choose a maintenance history file someone shared with you to add their bike to your
            garage with its full history.
          </ThemedText>

          <Pressable onPress={handleChooseFile} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.chooseButton}>
              <ThemedText type="smallBold">Choose file</ThemedText>
            </ThemedView>
          </Pressable>

          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          {bundle && (
            <ThemedView type="backgroundElement" style={styles.previewCard}>
              <ThemedText type="smallBold">
                {bundle.motorcycle.nickname || `${bundle.motorcycle.make} ${bundle.motorcycle.model}`}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {bundle.motorcycle.year} {bundle.motorcycle.make} {bundle.motorcycle.model}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {bundle.maintenanceRecords.length} maintenance record
                {bundle.maintenanceRecords.length === 1 ? '' : 's'}
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
  chooseButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
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
