import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Optional fields are null (not undefined) when cleared so that updates
// actually null the column out instead of being skipped by drizzle's set().
export type MaintenanceRecordFormValues = {
  date: string;
  time: string | null;
  type: string;
  partNumber: string | null;
  mileage: number | null;
  cost: number | null;
  performedBy: string | null;
  description: string | null;
};

type MaintenanceRecordFormProps = {
  initial?: {
    date: string;
    time: string;
    type: string;
    partNumber: string;
    mileage: string;
    cost: string;
    performedBy: string;
    description: string;
  };
  submitLabel: string;
  onSubmit: (values: MaintenanceRecordFormValues) => void;
  footer?: ReactNode;
};

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

export function MaintenanceRecordForm({
  initial,
  submitLabel,
  onSubmit,
  footer,
}: MaintenanceRecordFormProps) {
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [time, setTime] = useState(initial?.time ?? nowTime());
  const [type, setType] = useState(initial?.type ?? '');
  const [partNumber, setPartNumber] = useState(initial?.partNumber ?? '');
  const [mileage, setMileage] = useState(initial?.mileage ?? '');
  const [cost, setCost] = useState(initial?.cost ?? '');
  const [performedBy, setPerformedBy] = useState(initial?.performedBy ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!date.trim() || !type.trim()) {
      setError('Date and type are required.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('Date must be YYYY-MM-DD so the log sorts correctly.');
      return;
    }

    const parsedMileage = mileage.trim() === '' ? null : Number(mileage);
    if (parsedMileage != null && !Number.isFinite(parsedMileage)) {
      setError('Mileage must be a number.');
      return;
    }

    const parsedCost = cost.trim() === '' ? null : Number(cost);
    if (parsedCost != null && !Number.isFinite(parsedCost)) {
      setError('Cost must be a number.');
      return;
    }

    onSubmit({
      date: date.trim(),
      time: emptyToNull(time),
      type: type.trim(),
      partNumber: emptyToNull(partNumber),
      mileage: parsedMileage,
      cost: parsedCost,
      performedBy: emptyToNull(performedBy),
      description: emptyToNull(description),
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.form}>
      <FormField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <FormField label="Time" value={time} onChangeText={setTime} placeholder="HH:MM" />
      <FormField
        label="Type"
        value={type}
        onChangeText={setType}
        placeholder="Oil change, repair, etc."
      />
      <FormField
        label="Part number"
        value={partNumber}
        onChangeText={setPartNumber}
        placeholder="Optional"
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
          <ThemedText type="smallBold">{submitLabel}</ThemedText>
        </ThemedView>
      </Pressable>

      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
