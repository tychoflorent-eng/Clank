import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type VehicleType, VehicleTypeField } from '@/components/vehicle-type-field';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { buildExternalDiagramLinks, type ExternalDiagramLink } from '@/lib/external-diagram-links';

export default function ModelSearchScreen() {
  const params = useLocalSearchParams<{ make?: string; model?: string; type?: string }>();

  const [type, setType] = useState<VehicleType>('motorcycle');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [links, setLinks] = useState<ExternalDiagramLink[] | null>(null);

  // "Find parts" on a vehicle screen lands here with the vehicle prefilled.
  useEffect(() => {
    if (typeof params.make === 'string' && params.make.trim()) {
      const nextType: VehicleType = params.type === 'car' ? 'car' : 'motorcycle';
      const nextMake = params.make.trim();
      const nextModel = typeof params.model === 'string' ? params.model.trim() : '';
      setType(nextType);
      setMake(nextMake);
      setModel(nextModel);
      setLinks(buildExternalDiagramLinks(nextMake, nextModel, nextType));
    }
  }, [params.make, params.model, params.type]);

  const handleSearch = () => {
    if (!make.trim()) {
      setLinks(null);
      return;
    }
    setLinks(buildExternalDiagramLinks(make.trim(), model.trim(), type));
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Search
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          Find OEM parts catalogs and wiring diagrams for a make and model.
        </ThemedText>

        <ThemedView style={styles.form}>
          <VehicleTypeField value={type} onChange={setType} />
          <FormField label="Make" value={make} onChangeText={setMake} placeholder="Honda" />
          <FormField
            label="Model"
            value={model}
            onChangeText={setModel}
            placeholder="Optional"
          />
          <Pressable onPress={handleSearch} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundSelected" style={styles.searchButton}>
              <ThemedText type="smallBold">Find parts & diagrams</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        <FlatList
          data={links ?? []}
          keyExtractor={(item) => item.site}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            links ? (
              <ThemedText themeColor="textSecondary">No results.</ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => Linking.openURL(item.url)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.linkCard}>
                <ThemedText type="smallBold">{item.site}</ThemedText>
                <ThemedText themeColor="textSecondary">{item.url}</ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  emptyText: {
    maxWidth: 480,
  },
  form: { gap: Spacing.two },
  pressed: { opacity: 0.7 },
  searchButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.one,
  },
  list: { gap: Spacing.two },
  linkCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
});
