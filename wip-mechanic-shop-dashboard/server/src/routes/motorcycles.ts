import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { motorcycles } from "../db/schema.js";

interface MotorcycleBody {
  make: string;
  model: string;
  year: number;
  nickname?: string;
  vin?: string;
  plate?: string;
  color?: string;
  mileage?: number;
  notes?: string;
}

export async function motorcyclesRoutes(app: FastifyInstance) {
  app.get("/api/motorcycles", async () => {
    return db.select().from(motorcycles).orderBy(motorcycles.createdAt).all();
  });

  app.get<{ Params: { id: string } }>("/api/motorcycles/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const motorcycle = db.select().from(motorcycles).where(eq(motorcycles.id, id)).get();
    if (!motorcycle) return reply.code(404).send({ error: "Motorcycle not found" });
    return motorcycle;
  });

  app.post<{ Body: MotorcycleBody }>("/api/motorcycles", async (req, reply) => {
    const { make, model, year, nickname, vin, plate, color, mileage, notes } = req.body;
    if (!make || !model || !year) {
      return reply.code(400).send({ error: "make, model, and year are required" });
    }
    const now = new Date().toISOString();
    const result = db
      .insert(motorcycles)
      .values({
        make,
        model,
        year,
        nickname,
        vin,
        plate,
        color,
        mileage,
        notes,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return reply.code(201).send(result);
  });

  app.put<{ Params: { id: string }; Body: Partial<MotorcycleBody> }>(
    "/api/motorcycles/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      const existing = db.select().from(motorcycles).where(eq(motorcycles.id, id)).get();
      if (!existing) return reply.code(404).send({ error: "Motorcycle not found" });

      const updated = db
        .update(motorcycles)
        .set({ ...req.body, updatedAt: new Date().toISOString() })
        .where(eq(motorcycles.id, id))
        .returning()
        .get();
      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/motorcycles/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const existing = db.select().from(motorcycles).where(eq(motorcycles.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "Motorcycle not found" });

    db.delete(motorcycles).where(eq(motorcycles.id, id)).run();
    return reply.code(204).send();
  });
}
