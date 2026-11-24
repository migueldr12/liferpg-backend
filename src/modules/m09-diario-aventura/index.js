const { env } = require('../../config/env');
const { currentUser } = require('../../shared/middlewares/currentUser');
const { ZONA_POR_DEFECTO } = require('../../shared/utils/zonaHoraria');
const { createDiaryServices } = require('./application/services');
const { createPrismaDiaryRepository } = require('./infrastructure/repositories/prismaDiaryRepository');
const { createDiaryRouter } = require('./interfaces/routes');

// Punto de entrada del M09 (Diario de aventura · PWA Perfil lite): conecta las capas.
// El router raíz (src/routes/index.js) lo monta en /api/v1/diario.
//
// - diaryRepository: MongoDB con Prisma por defecto; las pruebas pasan uno en memoria.
// - timeZone: zona con la que las gráficas agrupan por día y por mes (TIME_ZONE).
function createDiarioModule({
  now = () => new Date(),
  timeZone = process.env.TIME_ZONE || ZONA_POR_DEFECTO,
  diaryRepository = createPrismaDiaryRepository(),
  devUserId = env.devUserId,
} = {}) {
  const services = createDiaryServices({ diaryRepository, now, timeZone });
  const auth = currentUser({ allowDevHeader: env.allowDevAuth, devUserId });
  return { router: createDiaryRouter({ services, auth }), services };
}

module.exports = { createDiarioModule };
