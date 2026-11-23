const { env } = require('../../config/env');
const { currentUser } = require('../../shared/middlewares/currentUser');
const { getPrisma } = require('../../shared/infrastructure/database/prisma');
const { PrismaMoodRepository } = require('./infrastructure/repositories/PrismaMoodRepository');
const { makeRegistrarEstadoAnimo } = require('./application/services/registrarEstadoAnimo');
const { makeConsultarRegistroHoy } = require('./application/services/consultarRegistroHoy');
const {
  makeConsultarRecordatorio,
  makeProgramarRecordatorioAnimo,
} = require('./application/services/programarRecordatorioAnimo');
const { makeConsultarTendenciaAnimo } = require('./application/services/consultarTendenciaAnimo');
const {
  makeConsultarEntradasDiario,
  makeAgregarEntradaDiario,
  makeActualizarEntradaDiario,
  makeEliminarEntradaDiario,
} = require('./application/services/diarioAnimo');
const { makeMoodController } = require('./interfaces/controllers/moodController');
const { makeMoodRouter } = require('./interfaces/routes/moodRoutes');

// Punto de entrada del M06 (Estado de ánimo · Tracker): conecta las capas.
// El router raíz (src/routes/index.js) lo monta en /api/v1/animo.
//
// - moodRepository: MongoDB con Prisma por defecto; las pruebas pasan otro (tests/support).
// - now: reloj (las pruebas lo controlan).
// - timeZone: zona con la que se decide qué día es "hoy" (TIME_ZONE, por defecto México).
// - Usuario: currentUser (x-user-id / DEV_USER_ID fuera de producción, hasta que exista el M00).
//   devUserId: usuario de prueba (DEV_USER_ID); las pruebas pasan null.

function createMoodModule({
  now = () => new Date(),
  timeZone = process.env.TIME_ZONE || 'America/Mexico_City',
  moodRepository = new PrismaMoodRepository({ db: getPrisma, timeZone }),
  devUserId = env.devUserId ?? process.env.DEV_USER_ID ?? null,
} = {}) {
  const deps = { moodRepository, clock: now, timeZone };

  const services = {
    registrarEstadoAnimo: makeRegistrarEstadoAnimo(deps),
    consultarRegistroHoy: makeConsultarRegistroHoy(deps),
    consultarRecordatorio: makeConsultarRecordatorio(deps),
    programarRecordatorioAnimo: makeProgramarRecordatorioAnimo(deps),
    consultarTendenciaAnimo: makeConsultarTendenciaAnimo(deps),
    consultarEntradasDiario: makeConsultarEntradasDiario(deps),
    agregarEntradaDiario: makeAgregarEntradaDiario(deps),
    actualizarEntradaDiario: makeActualizarEntradaDiario(deps),
    eliminarEntradaDiario: makeEliminarEntradaDiario(deps),
  };

  const auth = currentUser({
    allowDevHeader: env.allowDevAuth ?? env.nodeEnv !== 'production',
    devUserId,
  });

  return { services, router: makeMoodRouter(makeMoodController(services), auth) };
}

module.exports = { createMoodModule };
