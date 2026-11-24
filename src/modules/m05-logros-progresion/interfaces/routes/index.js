const { Router } = require('express');
const { env } = require('../../../../config/env');
const { currentUser } = require('../../../../shared/middlewares/currentUser');
const { makeConsultarLogros } = require('../../application/services/consultarLogros');
const { createPrismaAchievementRepository } = require('../../infrastructure/repositories/prismaAchievementRepository');
const { makeAchievementController } = require('../controllers/achievementController');

function createAchievementRouter({ achievementRepository = createPrismaAchievementRepository() } = {}) {
  const router = Router();
  const controller = makeAchievementController({ consultarLogros: makeConsultarLogros(achievementRepository) });
  router.use(currentUser({ allowDevHeader: env.allowDevAuth, devUserId: env.devUserId }));
  router.get('/', controller.list);
  return router;
}

module.exports = { createAchievementRouter };
