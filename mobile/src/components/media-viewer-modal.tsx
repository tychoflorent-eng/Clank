import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type MediaViewerModalProps = {
  visible: boolean;
  uri: string | null;
  kind: 'image' | 'video';
  onClose: () => void;
};

export function MediaViewerModal({ visible, uri, kind, onClose }: MediaViewerModalProps) {
  const player = useVideoPlayer(kind === 'video' ? uri : null, (instance) => {
    instance.loop = false;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {uri &&
          (kind === 'image' ? (
            <Image source={{ uri }} style={styles.media} contentFit="contain" />
          ) : (
            <VideoView player={player} style={styles.media} contentFit="contain" />
          ))}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.closeLabel}>
            Close
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  closeLabel: { color: '#fff' },
  pressed: { opacity: 0.7 },
});
