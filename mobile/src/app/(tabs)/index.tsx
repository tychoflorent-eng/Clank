import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { FlatList, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { vehicles } from '@/db/schema';

type Vehicle = typeof vehicles.$inferSelect;

function VehicleCard({ vehicle, archived }: { vehicle: Vehicle; archived?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/vehicle/${vehicle.id}`)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, archived && styles.archivedCard]}>
        <ThemedView style={styles.cardTitleRow}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {vehicle.type === 'car' ? 'Car' : 'Motorcycle'}
          </ThemedText>
        </ThemedView>
        <ThemedText themeColor="textSecondary">
          {vehicle.year} {vehicle.make} {vehicle.model}
          {vehicle.mileage != null ? ` · ${vehicle.mileage.toLocaleString()} mi` : ''}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export default function GarageScreen() {
  const { data: items } = useLiveQuery(
    db.select().from(vehicles).orderBy(desc(vehicles.createdAt)),
  );

  const active = items.filter((vehicle) => vehicle.status === 'active');
  const archived = items.filter((vehicle) => vehicle.status === 'archived');

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
          data={active}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No vehicles yet. Add one to start a maintenance log, or import a vehicle someone
              shared with you.
            </ThemedText>
          }
          renderItem={({ item }) => <VehicleCard vehicle={item} />}
          ListFooterComponent={
            archived.length > 0 ? (
              <ThemedView style={styles.pastSection}>
                <ThemedText type="subtitle" style={styles.pastTitle}>
                  Past vehicles
                </ThemedText>
                {archived.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} archived />
                ))}
              </ThemedView>
            ) : null
          }
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
  archivedCard: { opacity: 0.6 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 18, lineHeight: 24 },
  pastSection: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  pastTitle: { fontSize: 22, lineHeight: 28 },
});
