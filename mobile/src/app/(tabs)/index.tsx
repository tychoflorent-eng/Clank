import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { FlatList, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { motorcycles } from '@/db/schema';

export default function GarageScreen() {
  const { data: bikes } = useLiveQuery(
    db
      .select()
      .from(motorcycles)
      .where(eq(motorcycles.status, 'active'))
      .orderBy(desc(motorcycles.createdAt)),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Garage
          </ThemedText>
          <ThemedView style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/motorcycle/import')}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.addButton}>
                <ThemedText type="smallBold">Import</ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable
              onPress={() => router.push('/motorcycle/new')}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.addButton}>
                <ThemedText type="smallBold">Add</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </ThemedView>

        <FlatList
          data={bikes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No motorcycles yet. Add one to start a maintenance log, or import a bike someone
              shared with you.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/motorcycle/${item.id}`)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  {item.nickname || `${item.make} ${item.model}`}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {item.year} {item.make} {item.model}
                  {item.mileage != null ? ` · ${item.mileage.toLocaleString()} mi` : ''}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 32, lineHeight: 40 },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  addButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  list: { gap: Spacing.two },
  emptyText: { maxWidth: 480 },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  cardTitle: { fontSize: 18, lineHeight: 24 },
});
