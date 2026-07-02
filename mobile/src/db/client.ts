import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

const expoDb = openDatabaseSync('clank.db', { enableChangeListener: true });

// SQLite leaves foreign keys off per-connection; without this the schema's
// ON DELETE CASCADE clauses never fire and deletes would orphan child rows.
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
