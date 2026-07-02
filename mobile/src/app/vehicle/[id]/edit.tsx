import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type VehicleType, VehicleTypeField } from '@/components/vehicle-type-field';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { vehicles } from '@/db/schema';

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const { data: vehicleRows, updatedAt } = useLiveQuery(
    db.select().from(vehicles).where(eq(vehicles.id, vehicleId)),
    [vehicleId],
  );
  const vehicle = vehicleRows[0];

  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<VehicleType>('motorcycle');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle && !loaded) {
      setType(vehicle.type);
      setMake(vehicle.make);
      setModel(vehicle.model);
      setYear(String(vehicle.year));
      setNickname(vehicle.nickname ?? '');
      setVin(vehicle.vin ?? '');
      setPlate(vehicle.plate ?? '');
      setColor(vehicle.color ?? '');
      setMileage(vehicle.mileage != null ? String(vehicle.mileage) : '');
      setNotes(vehicle.notes ?? '');
      setLoaded(true);
    }
  }, [vehicle, loaded]);

  if (!vehicle) {
    // Live query still loading — don't flash "not found".
    if (updatedAt === undefined) {
      return <ThemedView style={styles.container} />;
    }
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Vehicle not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleSave = () => {
    const parsedYear = Number(year);
    if (!make.trim() || !model.trim() || !year.trim() || !Number.isInteger(parsedYear)) {
      setError('Make, model, and a valid year are required.');
      return;
    }

    const parsedMileage = mileage.trim() === '' ? undefined : Number(mileage);
    if (parsedMileage != null && !Number.isFinite(parsedMileage)) {
      setError('Mileage must be a number.');
      return;
    }

    db.update(vehicles)
      .set({
        type,
        make: make.trim(),
        model: model.trim(),
        year: parsedYear,
        nickname: emptyToUndefined(nickname),
        vin: emptyToUndefined(vin),
        plate: emptyToUndefined(plate),
        color: emptyToUndefined(color),
        mileage: parsedMileage,
        notes: emptyToUndefined(notes),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vehicles.id, vehicleId))
      .run();

    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete this vehicle?',
      'Its maintenance log and history are permanently deleted. If you sold it, use "No longer own this vehicle" instead to keep the history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            db.delete(vehicles).where(eq(vehicles.id, vehicleId)).run();
            router.dismissAll();
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Edit vehicle' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.form}>
          <VehicleTypeField value={type} onChange={setType} />
          <FormField label="Make" value={make} onChangeText={setMake} placeholder="Honda" />
          <FormField
            label="Model"
            value={model}
            onChangeText={setModel}
            placeholder={type === 'car' ? 'Civic' : 'CB500F'}
          />
          <FormField
            label="Year"
            value={year}
            onChangeText={setYear}
            placeholder="2021"
            keyboardType="number-pad"
          />
          <FormField
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Optional"
          />
          <FormField label="VIN" value={vin} onChangeText={setVin} placeholder="Optional" />
          <FormField
            label="Plate"
            value={plate}
            onChangeText={setPlate}
            placeholder="Optional"
          />
          <FormField label="Color" value={color} onChangeText={setColor} placeholder="Optional" />
          <FormField
            label="Mileage"
            value={mileage}
            onChangeText={setMileage}
            placeholder="Optional"
            keyboardType="number-pad"
          />
          <FormField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
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

          <Pressable onPress={handleDelete} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.deleteButton}>
              <ThemedText type="smallBold">Delete vehicle</ThemedText>
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
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
});
