import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MaintenanceRecordForm,
  type MaintenanceRecordFormValues,
} from '@/components/maintenance-record-form';
import { ThemedView } from '@/components/themed-view';
import { db } from '@/db/client';
import { maintenanceRecords } from '@/db/schema';

export default function NewMaintenanceRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const handleSubmit = (values: MaintenanceRecordFormValues) => {
    db.insert(maintenanceRecords)
      .values({ vehicleId, ...values })
      .run();
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Add repair / maintenance' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <MaintenanceRecordForm submitLabel="Save" onSubmit={handleSubmit} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
});
