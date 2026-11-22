const { notFound } = require('../../../../shared/errors/AppError');
const { MISSION_STATUS } = require('../../domain/entities/Mission');
const { toMissionDto } = require('../dtos/missionDtos');

// GET /misiones/:id · la pantalla de enfoque carga la misión antes de iniciar la sesión.
// Según el contrato, responde 404 si no existe o ya no está activa.
function consultarMision({ missionRepository }) {
  return async (userId, missionId) => {
    const mission = await missionRepository.findMission(userId, missionId);
    if (!mission || mission.status !== MISSION_STATUS.ACTIVE) throw notFound('La misión ya no está activa.');
    return toMissionDto(mission);
  };
}

module.exports = { consultarMision };
