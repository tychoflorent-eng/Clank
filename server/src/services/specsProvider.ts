import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { specsCache } from "../db/schema.js";
import { config } from "../config.js";

export interface MotorcycleSpec {
  make: string;
  model: string;
  year: number;
  type?: string;
  displacement?: string;
  engine?: string;
  power?: string;
  torque?: string;
  top_speed?: string;
  dry_weight?: string;
  [key: string]: unknown;
}

const PROVIDER = "api-ninjas";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, specs don't change

async function fetchFromApiNinjas(make: string, model?: string, year?: number) {
  if (!config.apiNinjasKey) {
    throw new Error(
      "API_NINJAS_KEY is not configured on the server. Add it to server/.env to enable model search.",
    );
  }

  const params = new URLSearchParams({ make });
  if (model) params.set("model", model);
  if (year) params.set("year", String(year));

  const res = await fetch(`https://api.api-ninjas.com/v1/motorcycles?${params.toString()}`, {
    headers: { "X-Api-Key": config.apiNinjasKey },
  });

  if (!res.ok) {
    throw new Error(`API Ninjas request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as MotorcycleSpec[];
}

export async function searchSpecs(
  make: string,
  model?: string,
  year?: number,
): Promise<MotorcycleSpec[]> {
  const normMake = make.trim().toLowerCase();
  const normModel = model?.trim().toLowerCase() ?? "";
  // 0 is a sentinel for "year not specified" so the lookup stays a plain equality
  // (SQL "= NULL" never matches, and an omitted clause would collide with cached years).
  const normYear = year ?? 0;

  const cached = db
    .select()
    .from(specsCache)
    .where(
      and(
        eq(specsCache.provider, PROVIDER),
        eq(specsCache.make, normMake),
        eq(specsCache.model, normModel),
        eq(specsCache.year, normYear),
      ),
    )
    .get();

  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return JSON.parse(cached.dataJson) as MotorcycleSpec[];
  }

  const results = await fetchFromApiNinjas(make, model, year);
  const dataJson = JSON.stringify(results);

  if (cached) {
    db.update(specsCache)
      .set({ dataJson, fetchedAt: new Date().toISOString() })
      .where(eq(specsCache.id, cached.id))
      .run();
  } else {
    db.insert(specsCache)
      .values({ provider: PROVIDER, make: normMake, model: normModel, year: normYear, dataJson })
      .run();
  }

  return results;
}
