import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  apiNinjasKey: process.env.API_NINJAS_KEY ?? "",
};
