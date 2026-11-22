const { Router } = require('express');
const { asyncHandler } = require('../shared/utils/asyncHandler');
const { version } = require('../../package.json');
const { env } = require('../config/env');

// GET /api/v1/health · confirma que la API responde y que llega a MongoDB.
// El M13 (RDF121 consultarHealthCheck) puede ampliarlo con IP, puertos y modo LAN.
function createHealthRouter({ pingDatabase }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    let database = 'ok';
    try {
      await pingDatabase();
    } catch {
      database = 'error';
    }
    res.status(database === 'ok' ? 200 : 503).json({
      status: database === 'ok' ? 'ok' : 'degraded',
      version,
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      database,
    });
  }));

  return router;
}

module.exports = { createHealthRouter };
