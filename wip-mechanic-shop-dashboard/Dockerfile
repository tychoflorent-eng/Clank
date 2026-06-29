FROM node:22-bookworm-slim AS base
WORKDIR /app
# better-sqlite3 is a native module; these let npm compile it from source
# if no prebuilt binary matches this image's Node ABI/platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# ---- install full deps (incl. dev) once, reused by the build stage ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

# ---- build client (Vite) + server (tsc) ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- clean production-only install, kept separate from the dev install above ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --omit=dev

# ---- final image: just the runtime, no toolchain ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATA_DIR=/data

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "server/dist/index.js"]
