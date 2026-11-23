const { conflict, notFound } = require('../../../../shared/errors/AppError');
const { MISSION_STATUS } = require('../../domain/entities/Mission');
const { toSessionDto } = require('../dtos/missionDtos');

// RDF039 · iniciarSesionEnfoque: abre el temporizador de una misión activa.
// El bloqueo de pantalla lo hace la app; aquí se registra la sesión.
function iniciarSesionEnfoque({ missionRepository, now }) {
  return async (userId, missionId) => {
    const mission = await missionRepository.findMission(userId, missionId);
    if (!mission) throw notFound('La misión no existe.');
    if (mission.status !== MISSION_STATUS.ACTIVE) throw conflict('La misión ya no está activa.');

    const running = await missionRepository.findRunningSession(userId);
    if (running) throw conflict('Ya tienes una sesión en curso.', { sessionId: running.id, missionId: running.missionId });

    if (await missionRepository.hasCompletedSession(missionId)) {
      throw conflict('Esta misión ya terminó su sesión y espera tu confirmación.');
    }

    const session = await missionRepository.startSession({
      userId, missionId, plannedMinutes: mission.durationMin, at: now(),
    });
    return toSessionDto(session, mission);
  };
}

module.exports = { iniciarSesionEnfoque };
