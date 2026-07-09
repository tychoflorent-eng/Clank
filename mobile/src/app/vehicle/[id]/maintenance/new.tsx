import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MaintenanceRecordForm,
  type MaintenanceRecordFormValues,
} from '@/components/maintenance-record-form';
import { MediaPickerSection } from '@/components/media-picker-section';
import { MediaViewerModal } from '@/components/media-viewer-modal';
import { ThemedView } from '@/components/themed-view';
import { db } from '@/db/client';
import { maintenanceRecords } from '@/db/schema';
import { addAttachmentsToRecord, type PickedMediaAsset } from '@/lib/media';

export default function NewMaintenanceRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const [picked, setPicked] = useState<PickedMediaAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ uri: string; kind: 'image' | 'video' } | null>(null);

  const handleSubmit = async (values: MaintenanceRecordFormValues) => {
    if (saving) return;
    setSaving(true);
    try {
      const record = db
        .insert(maintenanceRecords)
        .values({ vehicleId, ...values })
        .returning()
        .get();
      await addAttachmentsToRecord(record.id, picked);
      router.back();
    } catch (err) {
      setSaving(false);
      Alert.alert('Could not save', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Add repair / maintenance' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <MaintenanceRecordForm
          submitLabel={saving ? 'Saving…' : 'Save'}
          onSubmit={(values) => void handleSubmit(values)}
          mediaSection={
            <MediaPickerSection
              picked={picked}
              onChangePicked={setPicked}
              onPreview={(uri, kind) => setPreview({ uri, kind })}
            />
          }
        />
      </SafeAreaView>

      <MediaViewerModal
        visible={preview !== null}
        uri={preview?.uri ?? null}
        kind={preview?.kind ?? 'image'}
        onClose={() => setPreview(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
});
