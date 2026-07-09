import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type TaskChecklistProps = {
  options: readonly string[];
  selected: string[];
  onToggle: (task: string) => void;
};

export function TaskChecklist({ options, selected, onToggle }: TaskChecklistProps) {
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">Common tasks</ThemedText>
      <ThemedView style={styles.row}>
        {options.map((task) => {
          const checked = selected.includes(task);
          return (
            <Pressable
              key={task}
              onPress={() => onToggle(task)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView
                type={checked ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.chip}>
                <ThemedText type="small">
                  {checked ? '✓ ' : ''}
                  {task}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: { opacity: 0.7 },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
});
