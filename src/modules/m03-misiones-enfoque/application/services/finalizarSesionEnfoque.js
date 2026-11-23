const { conflict, notFound } = require('../../../../shared/errors/AppError');
const {
  SESSION_STATUS, VALIDATION, hasReachedPlannedTime, rewardFor, validationOnFinish,
} = require('../../domain/entities/Mission');
const { toOutcomeDto } = require('../dtos/missionDtos');

// RDF041 · finalizarSesionEnfoque: al terminar el temporizador se registra la sesión y,
// si la misión se puede validar sola (bloqueo o smartwatch, RDF043), se otorgan los puntos.
// Si no, queda esperando la confirmación manual (validarMisionFisica).
// allowEarlyFinish permite terminar antes de tiempo, solo para demos en desarrollo.
function finalizarSesionEnfoque({ missionRepository, now, allowEarlyFinish = false }) {
  return async (userId, sessionId, { activity } = {}) => {
    const session = await missionRepository.findSession(userId, sessionId);
    if (!session) throw notFound('La sesión no existe.');
    if (session.status !== SESSION_STATUS.RUNNING) throw conflict('La sesión ya terminó.');

    const at = now();
    if (!allowEarlyFinish && !hasReachedPlannedTime(session, at)) {
      const remainingSeconds = Math.ceil((new Date(session.startedAt).getTime() + session.plannedMinutes * 60_000 - at.getTime()) / 1000);
      throw conflict('La sesión todavía no termina.', { remainingSeconds });
    }

    const mission = await missionRepository.findMission(userId, session.missionId);
    const validation = validationOnFinish(mission.type, activity);
    await missionRepository.completeSession({ sessionId, at });

    if (validation === VALIDATION.MANUAL) {
      return toOutcomeDto({ sessionId, mission, validation, claimed: false });
    }

    const usedActivity = validation === VALIDATION.WEARABLE ? activity : undefined;
    const result = await missionRepository.completeMission({
      userId,
      missionId: mission.id,
      sessionId,
      validation,
      activity: usedActivity,
      reward: rewardFor(mission.type, mission.durationMin),
      at,
    });
    return toOutcomeDto({ sessionId, mission: result.mission, validation, activity: usedActivity, claimed: true, profile: result.profile });
  };
}

module.exports = { finalizarSesionEnfoque };
