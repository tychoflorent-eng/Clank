import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MaintenanceRecordForm,
  type MaintenanceRecordFormValues,
} from '@/components/maintenance-record-form';
import { MediaPickerSection } from '@/components/media-picker-section';
import { MediaViewerModal } from '@/components/media-viewer-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { maintenanceRecords, mediaAttachments } from '@/db/schema';
import {
  addAttachmentsToRecord,
  deleteAttachment,
  deleteAttachmentFilesForRecords,
  mediaUri,
  type PickedMediaAsset,
} from '@/lib/media';

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

  // Attachments do change from this screen (removal is immediate), so these
  // stay live.
  const { data: attachments } = useLiveQuery(
    db.select().from(mediaAttachments).where(eq(mediaAttachments.recordId, recordIdNum)),
    [recordIdNum],
  );

  const [picked, setPicked] = useState<PickedMediaAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ uri: string; kind: 'image' | 'video' } | null>(null);

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

  const handleSubmit = async (values: MaintenanceRecordFormValues) => {
    if (saving) return;
    setSaving(true);
    try {
      db.update(maintenanceRecords)
        .set(values)
        .where(eq(maintenanceRecords.id, recordIdNum))
        .run();
      await addAttachmentsToRecord(recordIdNum, picked);
      router.back();
    } catch (err) {
      setSaving(false);
      Alert.alert('Could not save', err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveExisting = (attachmentId: number) => {
    Alert.alert('Remove this photo/video?', 'It is deleted from this record immediately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteAttachment(attachmentId) },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete this record?', 'Its photos and videos are deleted too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAttachmentFilesForRecords([recordIdNum]);
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
            tasks: record.tasks ?? '',
            partNumber: record.partNumber ?? '',
            mileage: record.mileage != null ? String(record.mileage) : '',
            cost: record.cost != null ? String(record.cost) : '',
            performedBy: record.performedBy ?? '',
            description: record.description ?? '',
          }}
          submitLabel={saving ? 'Saving…' : 'Save changes'}
          onSubmit={(values) => void handleSubmit(values)}
          mediaSection={
            <MediaPickerSection
              picked={picked}
              onChangePicked={setPicked}
              existing={attachments.map((attachment) => ({
                id: attachment.id,
                uri: mediaUri(attachment.filePath),
                kind: attachment.kind,
              }))}
              onRemoveExisting={handleRemoveExisting}
              onPreview={(uri, kind) => setPreview({ uri, kind })}
            />
          }
          footer={
            <Pressable onPress={handleDelete} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.deleteButton}>
                <ThemedText type="smallBold">Delete record</ThemedText>
              </ThemedView>
            </Pressable>
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
  notFound: { padding: Spacing.four },
  pressed: { opacity: 0.7 },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
});
