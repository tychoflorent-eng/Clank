import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type VehicleType = 'motorcycle' | 'car';

const OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'car', label: 'Car' },
];

type VehicleTypeFieldProps = {
  value: VehicleType;
  onChange: (value: VehicleType) => void;
};

export function VehicleTypeField({ value, onChange }: VehicleTypeFieldProps) {
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">Type</ThemedText>
      <ThemedView style={styles.row}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
            <ThemedView
              type={value === option.value ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.optionInner}>
              <ThemedText type="smallBold">{option.label}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two },
  option: { flex: 1 },
  pressed: { opacity: 0.7 },
  optionInner: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
