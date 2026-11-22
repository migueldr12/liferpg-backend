const { conflict, notFound } = require('../../../../shared/errors/AppError');
const { SESSION_STATUS } = require('../../domain/entities/Mission');
const { toHistoryEntryDto } = require('../dtos/missionDtos');

// RDF040 · rendirseSesion: por el botón "Rendirse" o porque la app detectó que el usuario
// salió durante el bloqueo. La misión queda fallida y no otorga puntos.
function rendirseSesion({ missionRepository, now }) {
  return async (userId, sessionId, { reason }) => {
    const session = await missionRepository.findSession(userId, sessionId);
    if (!session) throw notFound('La sesión no existe.');
    if (session.status !== SESSION_STATUS.RUNNING) throw conflict('La sesión ya terminó.');

    const { mission } = await missionRepository.abandonSession({
      sessionId, missionId: session.missionId, reason, at: now(),
    });
    return toHistoryEntryDto(mission);
  };
}

module.exports = { rendirseSesion };
