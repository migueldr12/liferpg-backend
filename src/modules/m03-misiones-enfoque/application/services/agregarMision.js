const { toMissionDto } = require('../dtos/missionDtos');

// RDF037 · agregarMision: misión única con título, tipo y duración estimada.
// Los datos ya llegan validados (interfaces/validators).
function agregarMision({ missionRepository }) {
  return async (userId, { title, type, durationMin }) => {
    const mission = await missionRepository.createMission({ userId, title, type, durationMin });
    return toMissionDto(mission);
  };
}

module.exports = { agregarMision };
