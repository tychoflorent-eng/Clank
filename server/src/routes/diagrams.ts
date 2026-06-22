import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { db, diagramsDir } from "../db/client.js";
import { diagrams, motorcycles } from "../db/schema.js";
import { buildExternalDiagramLinks } from "../services/externalDiagramLinks.js";

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function diagramsRoutes(app: FastifyInstance) {
  app.get<{ Params: { motorcycleId: string } }>(
    "/api/motorcycles/:motorcycleId/diagrams",
    async (req) => {
      const motorcycleId = Number(req.params.motorcycleId);
      return db.select().from(diagrams).where(eq(diagrams.motorcycleId, motorcycleId)).all();
    },
  );

  app.get<{ Params: { motorcycleId: string } }>(
    "/api/motorcycles/:motorcycleId/diagrams/external-links",
    async (req, reply) => {
      const motorcycleId = Number(req.params.motorcycleId);
      const motorcycle = db.select().from(motorcycles).where(eq(motorcycles.id, motorcycleId)).get();
      if (!motorcycle) return reply.code(404).send({ error: "Motorcycle not found" });
      return buildExternalDiagramLinks(motorcycle.make, motorcycle.model);
    },
  );

  app.post<{ Params: { motorcycleId: string }; Querystring: { title?: string } }>(
    "/api/motorcycles/:motorcycleId/diagrams",
    async (req, reply) => {
      const motorcycleId = Number(req.params.motorcycleId);
      const motorcycle = db.select().from(motorcycles).where(eq(motorcycles.id, motorcycleId)).get();
      if (!motorcycle) return reply.code(404).send({ error: "Motorcycle not found" });

      const file = await req.file();
      if (!file) return reply.code(400).send({ error: "No file uploaded" });
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return reply.code(415).send({ error: "Only PDF, PNG, JPEG, or WEBP files are allowed" });
      }

      const title = req.query.title?.trim() || file.filename;
      const ext = path.extname(file.filename) || "";
      const storedName = `${randomUUID()}${ext}`;
      const storedPath = path.join(diagramsDir, storedName);

      await pipeline(file.file, createWriteStream(storedPath));
      const stat = await fs.stat(storedPath);

      const result = db
        .insert(diagrams)
        .values({
          motorcycleId,
          title,
          fileName: file.filename,
          filePath: storedName,
          mimeType: file.mimetype,
          fileSize: stat.size,
          uploadedAt: new Date().toISOString(),
        })
        .returning()
        .get();

      return reply.code(201).send(result);
    },
  );

  app.get<{ Params: { id: string } }>("/api/diagrams/:id/file", async (req, reply) => {
    const id = Number(req.params.id);
    const diagram = db.select().from(diagrams).where(eq(diagrams.id, id)).get();
    if (!diagram) return reply.code(404).send({ error: "Diagram not found" });

    const filePath = path.join(diagramsDir, diagram.filePath);
    reply.header("Content-Type", diagram.mimeType);
    reply.header("Content-Disposition", `inline; filename="${diagram.fileName}"`);
    return reply.send(await fs.readFile(filePath));
  });

  app.delete<{ Params: { id: string } }>("/api/diagrams/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const diagram = db.select().from(diagrams).where(eq(diagrams.id, id)).get();
    if (!diagram) return reply.code(404).send({ error: "Diagram not found" });

    await fs.rm(path.join(diagramsDir, diagram.filePath), { force: true });
    db.delete(diagrams).where(eq(diagrams.id, id)).run();
    return reply.code(204).send();
  });
}
