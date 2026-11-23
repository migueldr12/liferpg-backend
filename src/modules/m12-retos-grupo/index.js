const { env } = require('../../config/env');
const { currentUser } = require('../../shared/middlewares/currentUser');
const { getPrisma } = require('../../shared/infrastructure/database/prisma');
const { ZONA_POR_DEFECTO } = require('../../shared/utils/zonaHoraria');
const { PrismaSocialRepository } = require('./infrastructure/repositories/PrismaSocialRepository');
const { PrismaChallengeRepository } = require('./infrastructure/repositories/PrismaChallengeRepository');
const { PrismaActivityRepository } = require('./infrastructure/repositories/PrismaActivityRepository');
const { makeRetosServices } = require('./application/services/retos');
const { makeRetosController } = require('./interfaces/controllers/retosController');
const { makeRetosRouter } = require('./interfaces/routes/retosRoutes');

// Punto de entrada del M12 (Retos y métricas de grupo · PWA Perfil lite): conecta las capas.
// El router raíz (src/routes/index.js) lo monta en /api/v1/retos.
//
// - Repositorios: MongoDB con Prisma por defecto; las pruebas pasan el cliente falso.
// - rewardItemName: artículo del catálogo (M14) que se entrega al cumplir un reto (RDF121).
// - timeZone: zona con la que se calculan "hoy", la semana y la fecha límite.

function createRetosModule({
  now = () => new Date(),
  timeZone = process.env.TIME_ZONE || ZONA_POR_DEFECTO,
  rewardItemName = process.env.CHALLENGE_REWARD_ITEM || 'Cofre raro',
  socialRepository = new PrismaSocialRepository({ db: getPrisma }),
  challengeRepository = new PrismaChallengeRepository({ db: getPrisma, rewardItemName }),
  activityRepository = new PrismaActivityRepository({ db: getPrisma }),
  devUserId = env.devUserId ?? process.env.DEV_USER_ID ?? null,
} = {}) {
  const services = makeRetosServices({ socialRepository, challengeRepository, activityRepository, clock: now, timeZone });

  const auth = currentUser({
    allowDevHeader: env.allowDevAuth ?? env.nodeEnv !== 'production',
    devUserId,
  });

  return { services, router: makeRetosRouter(makeRetosController(services), auth) };
}

module.exports = { createRetosModule };
