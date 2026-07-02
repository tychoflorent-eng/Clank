import { eq } from 'drizzle-orm';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MaintenanceRecordForm,
  type MaintenanceRecordFormValues,
} from '@/components/maintenance-record-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { maintenanceRecords } from '@/db/schema';

export default function EditMaintenanceRecordScreen() {
  const { recordId } = useLocalSearchParams<{ id: string; recordId: string }>();
  const recordIdNum = Number(recordId);

  // A one-time snapshot is enough here: the form owns its own state after
  // mount, and this screen is the only place the record can change.
  const record = useMemo(
    () =>
      db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, recordIdNum)).get(),
    [recordIdNum],
  );

  if (!record) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Edit record' }} />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ThemedText themeColor="textSecondary" style={styles.notFound}>
            Record not found.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleSubmit = (values: MaintenanceRecordFormValues) => {
    db.update(maintenanceRecords)
      .set(values)
      .where(eq(maintenanceRecords.id, recordIdNum))
      .run();
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete this record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, recordIdNum)).run();
          router.back();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Edit record' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <MaintenanceRecordForm
          initial={{
            date: record.date,
            time: record.time ?? '',
            type: record.type,
            partNumber: record.partNumber ?? '',
            mileage: record.mileage != null ? String(record.mileage) : '',
            cost: record.cost != null ? String(record.cost) : '',
            performedBy: record.performedBy ?? '',
            description: record.description ?? '',
          }}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          footer={
            <Pressable onPress={handleDelete} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.deleteButton}>
                <ThemedText type="smallBold">Delete record</ThemedText>
              </ThemedView>
            </Pressable>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  notFound: { padding: Spacing.four },
  pressed: { opacity: 0.7 },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
});
