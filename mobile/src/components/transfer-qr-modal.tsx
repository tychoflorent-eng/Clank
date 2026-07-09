import { Modal, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type TransferQrModalProps = {
  visible: boolean;
  onClose: () => void;
  // null means the history was too large to fit in a QR code.
  payload: string | null;
  vehicleName: string;
};

export function TransferQrModal({ visible, onClose, payload, vehicleName }: TransferQrModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>
            {vehicleName}
          </ThemedText>

          {payload ? (
            <>
              {/* White box regardless of theme: scanners want dark-on-light. */}
              <View style={styles.qrBox}>
                <QRCode value={payload} size={260} ecl="L" />
              </View>
              <ThemedText themeColor="textSecondary" style={styles.hint}>
                Have the new owner open Clank, tap Import in their Garage, and scan this code to
                receive the full maintenance history.
              </ThemedText>
            </>
          ) : (
            <ThemedText themeColor="textSecondary" style={styles.hint}>
              This maintenance history is too large to fit in a QR code. Use &quot;Share
              history&quot; to send it as a file instead.
            </ThemedText>
          )}

          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundSelected" style={styles.closeButton}>
              <ThemedText type="smallBold">Close</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
  },
  title: { textAlign: 'center' },
  qrBox: {
    backgroundColor: '#fff',
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  hint: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  closeButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
});
