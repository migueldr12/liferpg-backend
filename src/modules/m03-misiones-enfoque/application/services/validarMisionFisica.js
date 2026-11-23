const { conflict, notFound } = require('../../../../shared/errors/AppError');
const { MISSION_STATUS, SESSION_STATUS, VALIDATION, rewardFor } = require('../../domain/entities/Mission');
const { toOutcomeDto } = require('../dtos/missionDtos');

// RDF043 · validarMisionFisica, caso manual (POST /sesiones/:id/validar): cuando no hubo
// datos del smartwatch (o la misión es de Cultura), el usuario confirma que la completó y
// recibe sus puntos. Si ya estaba confirmada, devuelve el mismo resultado sin volver a pagar.
function validarMisionFisica({ missionRepository, now }) {
  return async (userId, sessionId) => {
    const session = await missionRepository.findSession(userId, sessionId);
    if (!session) throw notFound('La sesión no existe.');
    if (session.status !== SESSION_STATUS.COMPLETED) throw conflict('Primero termina la sesión de la misión.');

    const mission = await missionRepository.findMission(userId, session.missionId);
    if (mission.status === MISSION_STATUS.COMPLETED) {
      return toOutcomeDto({ sessionId, mission, validation: mission.validation, activity: mission.activity ?? undefined, claimed: true });
    }
    if (mission.status !== MISSION_STATUS.ACTIVE) throw conflict('La misión ya no está activa.');

    const result = await missionRepository.completeMission({
      userId,
      missionId: mission.id,
      sessionId,
      validation: VALIDATION.MANUAL,
      reward: rewardFor(mission.type, mission.durationMin),
      at: now(),
    });
    return toOutcomeDto({ sessionId, mission: result.mission, validation: VALIDATION.MANUAL, claimed: true, profile: result.profile });
  };
}

module.exports = { validarMisionFisica };
