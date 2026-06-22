# Clank

Self-hosted motorcycle maintenance tracker for a shop network. One machine runs the server,
every mechanic on the LAN reaches it from a browser — nothing to install per person.

Scope for now: motorcycles only, Linux/Windows server, browser clients. Cars and a native mobile
app are deliberately out of scope until this is solid.

## Features

- **Garage** — track the motorcycles you own/service (make, model, year, VIN, mileage, notes)
- **Model search** — look up specs by make/model/year via the [API Ninjas Motorcycles API](https://api-ninjas.com/api/motorcycles), cached locally so repeated lookups work offline
- **Maintenance log** — per-motorcycle history of services, parts, cost, who did the work
- **Diagrams** — upload your own manuals/exploded-view diagrams (PDF/PNG/JPEG/WEBP) per motorcycle, plus quick links out to RevZilla/Partzilla/7zap's own search results when you don't have a local copy (there's no public API for OEM parts diagrams, so this app never scrapes or embeds their content)

## Stack

- `server/` — Fastify + TypeScript, SQLite via Drizzle ORM (WAL mode, safe for a handful of concurrent LAN clients)
- `client/` — React + TypeScript + Vite SPA
- In production the server serves the built client too, so the whole app is one process on one port

## Setup

Requires Node.js 20+.

```bash
npm install

# Server config
cp server/.env.example server/.env
# Edit server/.env and set API_NINJAS_KEY (free signup at https://api-ninjas.com/api/motorcycles)
# Model search returns empty results without a key; everything else still works.

npm run db:migrate
```

## Development

Runs the API on :4000 and the Vite dev server (with hot reload) on :5173, proxying API calls:

```bash
npm run dev
```

Open http://localhost:5173

## Production (LAN-hosted)

Build the client and start the single server process:

```bash
npm run build
npm start
```

The server binds `0.0.0.0:4000` and serves both the API and the built UI. Find this machine's
LAN IP (`ip addr` / `ipconfig`) and have other mechanics open `http://<that-ip>:4000` in their
browser. Open port 4000 in the host's firewall if needed.

To change the port, set `PORT` in `server/.env`.

## Data storage

- SQLite database and uploaded diagram files live under `data/` (gitignored). Back this directory
  up if you care about the maintenance history and uploaded manuals.
