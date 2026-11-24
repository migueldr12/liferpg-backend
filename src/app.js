const express = require("express");
const { env } = require("./config/env");
const { createApiRouter } = require("./routes");
const { cors } = require("./shared/middlewares/cors");
const { requestLogger } = require("./shared/middlewares/requestLogger");
const { notFoundHandler } = require("./shared/middlewares/notFound");
const { errorHandler } = require("./shared/middlewares/errorHandler");
const { getPrisma } = require("./shared/infrastructure/database/prisma");

// Crea la app de Express sin abrir el puerto, para poder probarla.
// Las dependencias externas se reciben por parámetro; las pruebas pasan dobles.
function createApp({
  pingDatabase = () => getPrisma().$runCommandRaw({ ping: 1 }),
  missionRepository,
  achievementRepository,
  diaryRepository,
  now,
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(cors(env.corsOrigins));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1", createApiRouter({ pingDatabase, missionRepository, achievementRepository, diaryRepository, now }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
