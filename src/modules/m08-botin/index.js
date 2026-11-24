const { env } = require('../../config/env');
const { currentUser } = require('../../shared/middlewares/currentUser');
const { createFcmClient } = require('../../shared/infrastructure/push/fcmClient');
const { createBotinServices } = require('./application/services');
const { createPrismaBotinRepository } = require('./infrastructure/repositories/prismaBotinRepository');
const { createBotinRouter } = require('./interfaces/routes');

// Punto de entrada del M08 (Botín · regalos entre amigos · PWA Perfil lite): conecta las capas.
// El router raíz (src/routes/index.js) lo monta en /api/v1/botin.
//
// - botinRepository: MongoDB con Prisma por defecto; las pruebas pasan uno en memoria.
// - pushSender: Firebase Cloud Messaging para avisar al amigo (RDF090). Sin las variables
//   FCM_* no se manda nada y el regalo se entrega igual.
function createBotinModule({
  now = () => new Date(),
  botinRepository = createPrismaBotinRepository(),
  pushSender = createFcmClient(),
  devUserId = env.devUserId,
} = {}) {
  const services = createBotinServices({ botinRepository, pushSender, now });
  const auth = currentUser({ allowDevHeader: env.allowDevAuth, devUserId });
  return { router: createBotinRouter({ services, auth }), services };
}

module.exports = { createBotinModule };
