# Clank (mobile)

A local-first motorcycle maintenance log. Everything lives in an on-device SQLite database —
there's no account and no server. When you sell a bike, you export its full history to a file and
share it with the buyer, who imports it into their own copy of the app.

## Stack

- [Expo](https://expo.dev) / React Native, with [Expo Router](https://docs.expo.dev/router/introduction/)
  for file-based navigation (tabs + pushed detail/form screens via a root `Stack`).
- [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM](https://orm.drizzle.team/)
  for the local database, with `useLiveQuery` keeping screens in sync with writes.
- [`expo-file-system`](https://docs.expo.dev/versions/latest/sdk/filesystem/) +
  [`expo-sharing`](https://docs.expo.dev/versions/latest/sdk/sharing/) for the export/import handoff.

Targets are Android first, then iOS. Web (`expo start --web`) is useful for quickly checking layout,
but isn't a shipping target — `expo-sqlite`'s web backend needs COOP/COEP headers the dev server
doesn't set, so the database won't actually open in a browser.

## Getting started

```bash
npm install
npx expo start
```

Migrations run automatically on launch (see `src/components/migration-gate.tsx`); there's nothing to
run by hand. Schema changes go in `src/db/schema.ts`, followed by `npx drizzle-kit generate`.

## Project layout

- `src/app/` — routes. `(tabs)/` holds the three tabs (Garage, Search, Settings); `motorcycle/`
  holds the pushed screens (add, import, and per-bike `[id]/` detail, edit, and maintenance forms).
- `src/db/` — Drizzle schema, generated migrations, and the SQLite client.
- `src/lib/transfer.ts` — builds and parses the export/import JSON bundle.
- `src/lib/external-diagram-links.ts` — deep-links to OEM parts catalogs by make/model.
- `src/components/` — shared UI (themed views/text, form fields, the migration gate).

## Data model

- `motorcycles` — one row per bike, with a `status` of `active` or `archived` (set when you mark a
  bike as no longer yours).
- `maintenanceRecords` — service history, one bike to many records.
- `ownershipEvents` — a provenance log (`added` / `imported` / `transferred_out`) that travels with
  the export bundle so a new owner's app can show the bike's full history, not just what happened
  since they imported it.
- `diagrams` — schema exists for per-bike uploaded files (wiring diagrams, manuals); not yet wired
  up to a screen.

## Export / import

"Share history" on a motorcycle's detail screen snapshots that bike, its maintenance records, and
its ownership events into a versioned JSON file and hands it to the OS share sheet. "Import" on the
Garage tab reads a picked file, previews it, and inserts it as a new motorcycle with its history
re-linked and an `imported` ownership event appended — no merging with existing bikes, no network
involved.
