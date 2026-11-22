const { conflict, notFound } = require('../../../../shared/errors/AppError');
const { MISSION_STATUS, VALIDATION, rewardFor } = require('../../domain/entities/Mission');
const { toOutcomeDto } = require('../dtos/missionDtos');

// RDF043 · validarMisionFisica, caso manual: cuando no hubo datos del smartwatch
// (o la misión es de Cultura), el usuario confirma que la completó y recibe sus puntos.
function validarMisionFisica({ missionRepository, now }) {
  return async (userId, missionId) => {
    const mission = await missionRepository.findMission(userId, missionId);
    if (!mission) throw notFound('La misión no existe.');
    if (mission.status !== MISSION_STATUS.ACTIVE) throw conflict('La misión ya no está activa.');
    if (!(await missionRepository.hasCompletedSession(missionId))) {
      throw conflict('Primero termina la sesión de la misión.');
    }

    const result = await missionRepository.completeMission({
      userId,
      missionId,
      validation: VALIDATION.MANUAL,
      reward: rewardFor(mission.type, mission.durationMin),
      at: now(),
    });
    return toOutcomeDto({ mission: result.mission, validation: VALIDATION.MANUAL, claimed: true, profile: result.profile });
  };
}

module.exports = { validarMisionFisica };
