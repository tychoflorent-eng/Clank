import type { FastifyInstance } from "fastify";
import { searchSpecs } from "../services/specsProvider.js";

export async function specsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { make?: string; model?: string; year?: string } }>(
    "/api/specs/search",
    async (req, reply) => {
      const { make, model, year } = req.query;
      if (!make) {
        return reply.code(400).send({ error: "make is required" });
      }

      try {
        const results = await searchSpecs(make, model, year ? Number(year) : undefined);
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.code(502).send({ error: message });
      }
    },
  );
}
