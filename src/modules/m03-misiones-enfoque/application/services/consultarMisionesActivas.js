const { toMissionDto } = require('../dtos/missionDtos');

// RDF035 · consultarMisionesActivas + RDF036 · filtrarMisionesPorTipo
function consultarMisionesActivas({ missionRepository }) {
  return async (userId, { type } = {}) => {
    const missions = await missionRepository.listActive(userId, { type });
    return missions.map(toMissionDto);
  };
}

module.exports = { consultarMisionesActivas };
