import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { FlatList, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { vehicles } from '@/db/schema';

export default function GarageScreen() {
  const { data: items } = useLiveQuery(
    db
      .select()
      .from(vehicles)
      .where(eq(vehicles.status, 'active'))
      .orderBy(desc(vehicles.createdAt)),
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
              onPress={() => router.push('/vehicle/import')}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.addButton}>
                <ThemedText type="smallBold">Import</ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable
              onPress={() => router.push('/vehicle/new')}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.addButton}>
                <ThemedText type="smallBold">Add</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </ThemedView>

        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No vehicles yet. Add one to start a maintenance log, or import a vehicle someone
              shared with you.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/vehicle/${item.id}`)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedView style={styles.cardTitleRow}>
                  <ThemedText type="subtitle" style={styles.cardTitle}>
                    {item.nickname || `${item.make} ${item.model}`}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.type === 'car' ? 'Car' : 'Motorcycle'}
                  </ThemedText>
                </ThemedView>
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 18, lineHeight: 24 },
});
