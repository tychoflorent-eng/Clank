import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { maintenanceRecords } from '@/db/schema';

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewMaintenanceRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const motorcycleId = Number(id);

  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState('');
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!date.trim() || !type.trim()) {
      setError('Date and type are required.');
      return;
    }

    const parsedMileage = mileage.trim() === '' ? undefined : Number(mileage);
    if (parsedMileage != null && !Number.isFinite(parsedMileage)) {
      setError('Mileage must be a number.');
      return;
    }

    const parsedCost = cost.trim() === '' ? undefined : Number(cost);
    if (parsedCost != null && !Number.isFinite(parsedCost)) {
      setError('Cost must be a number.');
      return;
    }

    db.insert(maintenanceRecords)
      .values({
        motorcycleId,
        date: date.trim(),
        type: type.trim(),
        mileage: parsedMileage,
        cost: parsedCost,
        performedBy: emptyToUndefined(performedBy),
        description: emptyToUndefined(description),
      })
      .run();

    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Add maintenance record' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.form}>
          <FormField
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
          <FormField
            label="Type"
            value={type}
            onChangeText={setType}
            placeholder="Oil change"
          />
          <FormField
            label="Mileage"
            value={mileage}
            onChangeText={setMileage}
            placeholder="Optional"
            keyboardType="number-pad"
          />
          <FormField
            label="Cost"
            value={cost}
            onChangeText={setCost}
            placeholder="Optional"
            keyboardType="decimal-pad"
          />
          <FormField
            label="Performed by"
            value={performedBy}
            onChangeText={setPerformedBy}
            placeholder="Optional"
          />
          <FormField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional"
            multiline
            numberOfLines={4}
          />

          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          <Pressable onPress={handleSave} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundSelected" style={styles.saveButton}>
              <ThemedText type="smallBold">Save</ThemedText>
            </ThemedView>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  form: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
});
