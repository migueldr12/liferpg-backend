const { conflict, notFound } = require('../../../../shared/errors/AppError');
const { MISSION_STATUS, SESSION_STATUS, VALIDATION } = require('../../domain/entities/Mission');
const { toOutcomeDto } = require('../dtos/missionDtos');

// GET /sesiones/:id/resultado · RDF042 · mostrarVictoria: la pantalla de victoria vuelve a
// pedir el resultado de una sesión terminada (por ejemplo, al reabrir la app).
function consultarResultadoSesion({ missionRepository }) {
  return async (userId, sessionId) => {
    const session = await missionRepository.findSession(userId, sessionId);
    if (!session) throw notFound('La sesión no existe.');
    if (session.status === SESSION_STATUS.RUNNING) throw conflict('La sesión sigue en curso.');
    if (session.status === SESSION_STATUS.ABANDONED) throw conflict('La sesión terminó sin completarse.');

    const mission = await missionRepository.findMission(userId, session.missionId);
    const claimed = mission.status === MISSION_STATUS.COMPLETED;
    return toOutcomeDto({
      sessionId,
      mission,
      // Sin validación guardada, la misión espera la confirmación manual
      validation: mission.validation ?? VALIDATION.MANUAL,
      activity: mission.activity ?? undefined,
      claimed,
    });
  };
}

module.exports = { consultarResultadoSesion };
