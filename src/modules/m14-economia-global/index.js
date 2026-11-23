const { env } = require('../../config/env');
const { currentUser } = require('../../shared/middlewares/currentUser');
const { requireAdmin } = require('../../shared/middlewares/requireAdmin');
const { getPrisma } = require('../../shared/infrastructure/database/prisma');
const { createFcmClient } = require('../../shared/infrastructure/push/fcmClient');
const { PrismaEconomyRepository } = require('./infrastructure/repositories/PrismaEconomyRepository');
const { PrismaCatalogRepository } = require('./infrastructure/repositories/PrismaCatalogRepository');
const { PrismaPushRepository } = require('./infrastructure/repositories/PrismaPushRepository');
const { makeConsultarEconomiaActiva, makePublicarEconomia } = require('./application/services/economia');
const {
  makeConsultarCategorias,
  makeAgregarCategoria,
  makeActualizarCategoria,
  makeEliminarCategoria,
  makeConsultarArticulos,
  makeAgregarArticulo,
  makeActualizarArticulo,
} = require('./application/services/catalogo');
const {
  makeConsultarAudiencia,
  makeConsultarHistorialEnvios,
  makeEnviarNotificacionPush,
} = require('./application/services/push');
const { makeEconomiaController } = require('./interfaces/controllers/economiaController');
const { makeEconomiaRouters } = require('./interfaces/routes/economiaRoutes');

// Punto de entrada del M14 (Balanceo de economía global · PWA Admin): conecta las capas.
// El router raíz (src/routes/index.js) monta sus tres routers en /economia, /catalogo y /push.
//
// - Repositorios: MongoDB con Prisma por defecto; las pruebas pasan otros (tests/support).
// - pushSender: Firebase Cloud Messaging (src/shared/infrastructure/push/fcmClient.js).
// - findRole: de dónde sale el rol del usuario (por defecto, la colección users).
// - services.consultarEconomiaActiva también la pueden usar otros módulos
//   (puntos por dificultad en M02/M03 y rango de precios en M04).

function createEconomiaModule({
  now = () => new Date(),
  economyRepository = new PrismaEconomyRepository({ db: getPrisma }),
  catalogRepository = new PrismaCatalogRepository({ db: getPrisma }),
  pushRepository = new PrismaPushRepository({ db: getPrisma }),
  pushSender = createFcmClient(),
  findRole,
  devUserId = env.devUserId ?? process.env.DEV_USER_ID ?? null,
} = {}) {
  const deps = { economyRepository, catalogRepository, pushRepository, pushSender, clock: now };

  const services = {
    consultarEconomiaActiva: makeConsultarEconomiaActiva(deps),
    publicarEconomia: makePublicarEconomia(deps),
    consultarCategorias: makeConsultarCategorias(deps),
    agregarCategoria: makeAgregarCategoria(deps),
    actualizarCategoria: makeActualizarCategoria(deps),
    eliminarCategoria: makeEliminarCategoria(deps),
    consultarArticulos: makeConsultarArticulos(deps),
    agregarArticulo: makeAgregarArticulo(deps),
    actualizarArticulo: makeActualizarArticulo(deps),
    consultarAudiencia: makeConsultarAudiencia(deps),
    consultarHistorialEnvios: makeConsultarHistorialEnvios(deps),
    enviarNotificacionPush: makeEnviarNotificacionPush(deps),
  };

  const auth = currentUser({
    allowDevHeader: env.allowDevAuth ?? env.nodeEnv !== 'production',
    devUserId,
  });
  const soloAdmin = requireAdmin({ findRole });

  return { services, routers: makeEconomiaRouters(makeEconomiaController(services), { auth, soloAdmin }) };
}

module.exports = { createEconomiaModule };
