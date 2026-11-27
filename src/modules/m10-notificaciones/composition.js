const { env } = require('../../config/env');
const { createPushService } = require('../../shared/infrastructure/push/pushService');
const { createUserRepository } = require('./infrastructure/repositories/userRepository');
const { createFriendshipRepository } = require('./infrastructure/repositories/friendshipRepository');
const { createStickerRepository } = require('./infrastructure/repositories/stickerRepository');
const { createAlertRepository } = require('./infrastructure/repositories/alertRepository');
const { createActivityRepository } = require('./infrastructure/repositories/activityRepository');
const { createConsultarCatalogoStickers } = require('./application/services/consultarCatalogoStickers');
const { createEnviarSticker } = require('./application/services/enviarSticker');
const { createConsultarHistorialStickers } = require('./application/services/consultarHistorialStickers');
const { createMarcarStickerVisto } = require('./application/services/marcarStickerVisto');
const { createDetectarInactividad } = require('./application/services/detectarInactividad');
const { createNotificarInactividad } = require('./application/services/notificarInactividad');
const { createConsultarAvisosInactividad } = require('./application/services/consultarAvisosInactividad');
const { createEjecutarRevisionInactividad } = require('./application/services/ejecutarRevisionInactividad');

function createRepositories() {
  return {
    users: createUserRepository(),
    friends: createFriendshipRepository(),
    stickers: createStickerRepository(),
    alerts: createAlertRepository(),
    activity: createActivityRepository(),
  };
}

// Arma los servicios de M10. Las pruebas pasan repositorios y push falsos.
function createNotificationsServices({ repositories = createRepositories(), push = createPushService() } = {}) {
  const { users, friends, stickers, alerts, activity } = repositories;
  const detect = createDetectarInactividad({ activity, alerts });
  const notify = createNotificarInactividad({ friends, push });
  return {
    consultarCatalogo: createConsultarCatalogoStickers({ stickers }),
    enviar: createEnviarSticker({ stickers, friends, push, users }),
    consultarHistorial: createConsultarHistorialStickers({ stickers }),
    marcarVisto: createMarcarStickerVisto({ stickers }),
    consultarAvisos: createConsultarAvisosInactividad({ alerts, friends }),
    ejecutarRevision: createEjecutarRevisionInactividad({ detect, notify }),
  };
}

// Función que usa el job automático (src/jobs/inactivityJob.js).
function createInactivityRunner(deps) {
  const { ejecutarRevision } = createNotificationsServices(deps);
  return (options = {}) =>
    ejecutarRevision({ thresholdDays: env.inactivity.thresholdDays, lowRate: env.inactivity.lowCompletionRate, ...options });
}

module.exports = { createRepositories, createNotificationsServices, createInactivityRunner };
