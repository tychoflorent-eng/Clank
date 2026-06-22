import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";
import { motorcyclesRoutes } from "./routes/motorcycles.js";
import { maintenanceRoutes } from "./routes/maintenance.js";
import { diagramsRoutes } from "./routes/diagrams.js";
import { specsRoutes } from "./routes/specs.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

await app.register(motorcyclesRoutes);
await app.register(maintenanceRoutes);
await app.register(diagramsRoutes);
await app.register(specsRoutes);

// In production the client is built to client/dist and served directly by this server,
// so the whole app is reachable from a single port over the LAN.
const clientDist = path.resolve(import.meta.dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
}

app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Clank server listening on ${address} (reachable on your LAN at this machine's IP)`);
});
