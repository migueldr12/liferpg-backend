const { Router } = require('express');
const { env } = require('../../../../config/env');
const { currentUser } = require('../../../../shared/middlewares/currentUser');
const { createMissionServices } = require('../../application/services');
const { createPrismaMissionRepository } = require('../../infrastructure/repositories/prismaMissionRepository');
const { createMissionController } = require('../controllers/missionController');

// Router del M03, montado en /api/v1/misiones. Las pruebas pasan otro repositorio y reloj.
function createMisionesRouter({
  missionRepository = createPrismaMissionRepository(),
  now,
  allowEarlyFinish = env.allowEarlyFinish,
} = {}) {
  const c = createMissionController(createMissionServices({ missionRepository, now, allowEarlyFinish }));
  const router = Router();

  router.use(currentUser({ allowDevHeader: env.allowDevAuth, devUserId: env.devUserId }));

  // RF010 · Tablero de selección
  router.get('/', c.listActive);
  router.post('/', c.create);
  router.get('/recompensa', c.previewReward);

  // RF012 · Validación e historial
  router.get('/historial', c.history);
  router.post('/:missionId/validacion-manual', c.confirmManual);

  // RF011 · Modo concentración
  router.post('/:missionId/sesiones', c.startSession);
  router.post('/sesiones/:sessionId/rendirse', c.abandonSession);
  router.post('/sesiones/:sessionId/finalizar', c.finishSession);

  return router;
}

module.exports = { createMisionesRouter };
