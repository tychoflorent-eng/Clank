import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type PickedMediaAsset, toPickedMedia } from '@/lib/media';

export type ExistingMedia = {
  id: number;
  uri: string;
  kind: 'image' | 'video';
};

type MediaPickerSectionProps = {
  picked: PickedMediaAsset[];
  onChangePicked: (assets: PickedMediaAsset[]) => void;
  existing?: ExistingMedia[];
  onRemoveExisting?: (id: number) => void;
  onPreview?: (uri: string, kind: 'image' | 'video') => void;
};

function Thumb({
  uri,
  kind,
  onPress,
  onRemove,
}: {
  uri: string;
  kind: 'image' | 'video';
  onPress?: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.thumbWrapper}>
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {kind === 'image' ? (
          <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.videoThumb]}>
            <ThemedText type="smallBold" style={styles.videoLabel}>
              ▶ Video
            </ThemedText>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={Spacing.two}
        style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.removeLabel}>
          ✕
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function MediaPickerSection({
  picked,
  onChangePicked,
  existing = [],
  onRemoveExisting,
  onPreview,
}: MediaPickerSectionProps) {
  const handleAddFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      onChangePicked([...picked, ...result.assets.map(toPickedMedia)]);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) {
      onChangePicked([...picked, ...result.assets.map(toPickedMedia)]);
    }
  };

  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">Photos & videos</ThemedText>

      <ThemedView style={styles.buttonRow}>
        <Pressable
          onPress={handleTakePhoto}
          style={({ pressed }) => [styles.buttonRowItem, pressed && styles.pressed]}>
          <ThemedView type="backgroundElement" style={styles.addButton}>
            <ThemedText type="smallBold">Take photo</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable
          onPress={handleAddFromLibrary}
          style={({ pressed }) => [styles.buttonRowItem, pressed && styles.pressed]}>
          <ThemedView type="backgroundElement" style={styles.addButton}>
            <ThemedText type="smallBold">Add from library</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>

      {(existing.length > 0 || picked.length > 0) && (
        <ThemedView style={styles.grid}>
          {existing.map((item) => (
            <Thumb
              key={`existing-${item.id}`}
              uri={item.uri}
              kind={item.kind}
              onPress={onPreview ? () => onPreview(item.uri, item.kind) : undefined}
              onRemove={() => onRemoveExisting?.(item.id)}
            />
          ))}
          {picked.map((item, index) => (
            <Thumb
              key={`picked-${index}-${item.uri}`}
              uri={item.uri}
              kind={item.kind}
              onPress={onPreview ? () => onPreview(item.uri, item.kind) : undefined}
              onRemove={() => onChangePicked(picked.filter((_, i) => i !== index))}
            />
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  buttonRowItem: { flex: 1 },
  addButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  thumbWrapper: { position: 'relative' },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: Spacing.two,
  },
  videoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
  },
  videoLabel: { color: '#fff' },
  removeButton: {
    position: 'absolute',
    top: -Spacing.one,
    right: -Spacing.one,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  removeLabel: { color: '#fff', fontSize: 11, lineHeight: 13 },
  pressed: { opacity: 0.7 },
});
