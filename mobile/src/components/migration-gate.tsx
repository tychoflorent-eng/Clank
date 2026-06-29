import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';

export function MigrationGate({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Database error</ThemedText>
        <ThemedText themeColor="textSecondary">{error.message}</ThemedText>
      </ThemedView>
    );
  }

  if (!success) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
