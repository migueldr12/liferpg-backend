const { toHistoryEntryDto } = require('../dtos/missionDtos');

// RDF044 · consultarHistorialMisiones: completadas y fallidas con fecha, tipo y puntos,
// filtrables por estado, tipo y rango de fechas.
function consultarHistorialMisiones({ missionRepository }) {
  return async (userId, { status, type, from, to, limit } = {}) => {
    const missions = await missionRepository.listHistory(userId, { status, type, from, to, limit });
    return missions.map(toHistoryEntryDto);
  };
}

module.exports = { consultarHistorialMisiones };
