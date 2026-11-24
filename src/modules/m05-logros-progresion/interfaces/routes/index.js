const { Router } = require('express');
const { env } = require('../../../../config/env');
const { currentUser } = require('../../../../shared/middlewares/currentUser');
const { ZONA_POR_DEFECTO } = require('../../../../shared/utils/zonaHoraria');
const { makeConsultarLogros } = require('../../application/services/consultarLogros');
const { makeConsultarDetalleLogro, makeReclamarRecompensaLogro } = require('../../application/services/fichaLogro');
const { makeConsultarComparativaMensual } = require('../../application/services/consultarComparativaMensual');
const { createPrismaAchievementRepository } = require('../../infrastructure/repositories/prismaAchievementRepository');
const { createPrismaProgressRepository } = require('../../infrastructure/repositories/prismaProgressRepository');
const { makeAchievementController } = require('../controllers/achievementController');

const auth = () => currentUser({ allowDevHeader: env.allowDevAuth, devUserId: env.devUserId });

// /logros · RDF060, RDF063 y RDF064 (docs/API.md del móvil)
function createAchievementRouter({ achievementRepository = createPrismaAchievementRepository(), now = () => new Date() } = {}) {
  const router = Router();
  const controller = makeAchievementController({
    consultarLogros: makeConsultarLogros(achievementRepository),
    consultarDetalleLogro: makeConsultarDetalleLogro(achievementRepository),
    reclamarRecompensaLogro: makeReclamarRecompensaLogro(achievementRepository, now),
  });
  router.use(auth());
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  router.post('/:id/reclamar', controller.claim);
  return router;
}

// /progreso · RF018 Tú vs. tú (RDF065 a RDF067)
function createProgressRouter({
  progressRepository = createPrismaProgressRepository(),
  now = () => new Date(),
  timeZone = process.env.TIME_ZONE || ZONA_POR_DEFECTO,
} = {}) {
  const router = Router();
  const controller = makeAchievementController({
    consultarComparativaMensual: makeConsultarComparativaMensual({ progressRepository, clock: now, timeZone }),
  });
  router.use(auth());
  router.get('/comparativa', controller.comparison);
  return router;
}

module.exports = { createAchievementRouter, createProgressRouter };
