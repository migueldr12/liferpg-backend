const { Router } = require('express');
const { env } = require('../../../../config/env');
const { currentUser } = require('../../../../shared/middlewares/currentUser');
const { createMissionServices } = require('../../application/services');
const { createPrismaMissionRepository } = require('../../infrastructure/repositories/prismaMissionRepository');
const { createMissionController } = require('../controllers/missionController');

// Routers del M03 según el contrato de la app (docs/API.md del móvil):
// /api/v1/misiones para las misiones y /api/v1/sesiones para las sesiones de enfoque.
// Las pruebas pasan otro repositorio y reloj.
function createM03Routers({
  missionRepository = createPrismaMissionRepository(),
  now,
  allowEarlyFinish = env.allowEarlyFinish,
} = {}) {
  const c = createMissionController(createMissionServices({ missionRepository, now, allowEarlyFinish }));
  const auth = currentUser({ allowDevHeader: env.allowDevAuth, devUserId: env.devUserId });

  const misiones = Router();
  misiones.use(auth);
  misiones.get('/', c.listActive); // RDF035 · RDF036
  misiones.post('/', c.create); // RDF037
  misiones.get('/recompensa', c.previewReward); // RDF038 (extra, no está en el contrato)
  misiones.get('/historial', c.history); // RDF044
  misiones.get('/:missionId', c.getOne);
  misiones.post('/:missionId/sesiones', c.startSession); // RDF039

  const sesiones = Router();
  sesiones.use(auth);
  sesiones.post('/:sessionId/fallar', c.failSession); // RDF040
  sesiones.post('/:sessionId/finalizar', c.finishSession); // RDF041 · RDF043
  sesiones.get('/:sessionId/resultado', c.sessionOutcome); // RDF042
  sesiones.post('/:sessionId/validar', c.confirmManual); // RDF043

  return { misiones, sesiones };
}

module.exports = { createM03Routers };
