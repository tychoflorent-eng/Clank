import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { maintenanceRecords, motorcycles } from "../db/schema.js";

interface MaintenanceBody {
  date: string;
  mileage?: number;
  type: string;
  description?: string;
  performedBy?: string;
  cost?: number;
}

export async function maintenanceRoutes(app: FastifyInstance) {
  app.get<{ Params: { motorcycleId: string } }>(
    "/api/motorcycles/:motorcycleId/maintenance",
    async (req) => {
      const motorcycleId = Number(req.params.motorcycleId);
      return db
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.motorcycleId, motorcycleId))
        .orderBy(desc(maintenanceRecords.date))
        .all();
    },
  );

  app.post<{ Params: { motorcycleId: string }; Body: MaintenanceBody }>(
    "/api/motorcycles/:motorcycleId/maintenance",
    async (req, reply) => {
      const motorcycleId = Number(req.params.motorcycleId);
      const motorcycle = db.select().from(motorcycles).where(eq(motorcycles.id, motorcycleId)).get();
      if (!motorcycle) return reply.code(404).send({ error: "Motorcycle not found" });

      const { date, mileage, type, description, performedBy, cost } = req.body;
      if (!date || !type) {
        return reply.code(400).send({ error: "date and type are required" });
      }

      const result = db
        .insert(maintenanceRecords)
        .values({
          motorcycleId,
          date,
          mileage,
          type,
          description,
          performedBy,
          cost,
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get();
      return reply.code(201).send(result);
    },
  );

  app.put<{ Params: { id: string }; Body: Partial<MaintenanceBody> }>(
    "/api/maintenance/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      const existing = db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id)).get();
      if (!existing) return reply.code(404).send({ error: "Maintenance record not found" });

      const updated = db
        .update(maintenanceRecords)
        .set(req.body)
        .where(eq(maintenanceRecords.id, id))
        .returning()
        .get();
      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/maintenance/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const existing = db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "Maintenance record not found" });

    db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id)).run();
    return reply.code(204).send();
  });
}
