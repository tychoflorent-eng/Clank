// Quick-pick tasks shown as checkboxes on the maintenance record form.
export const COMMON_TASKS = [
  'Oil change',
  'Coolant flush',
  'Brake fluid',
  'Air filter',
  'Tire pressure',
  'Tire rotation',
  'Chain maintenance',
  'Battery check',
] as const;

// The `tasks` column stores a JSON string array (or NULL when none picked).
export function parseTasks(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((task) => typeof task === 'string') : [];
  } catch {
    return [];
  }
}

export function serializeTasks(tasks: string[]): string | null {
  return tasks.length > 0 ? JSON.stringify(tasks) : null;
}
