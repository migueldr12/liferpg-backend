const { MISSION_STATUS, locksDevice, rewardFor } = require('../../domain/entities/Mission');

// Forma de las respuestas del M03. Coincide con los modelos de la app móvil
// (src/models/Mission.ts) para que su servicio cambie los datos simulados por la API.

// RDF035: una misión activa muestra la recompensa que dará; una terminada, la que dio
function toMissionDto(m) {
  return {
    id: m.id,
    title: m.title,
    type: m.type,
    durationMin: m.durationMin,
    status: m.status,
    reward: m.status === MISSION_STATUS.ACTIVE ? rewardFor(m.type, m.durationMin) : m.reward,
  };
}

function toSessionDto(s, mission) {
  return {
    id: s.id,
    missionId: s.missionId,
    status: s.status,
    startedAt: s.startedAt,
    durationMin: s.plannedMinutes,
    locksDevice: locksDevice(mission.type),
  };
}

// RDF044: una entrada del historial; las fallidas nunca dan puntos
function toHistoryEntryDto(m) {
  const failed = m.status === MISSION_STATUS.FAILED;
  return {
    id: m.id,
    title: m.title,
    type: m.type,
    durationMin: m.durationMin,
    status: m.status,
    finishedAt: m.completedAt ?? m.failedAt,
    ...(failed ? { failReason: m.failReason } : { validation: m.validation }),
    reward: failed ? { xp: 0, points: 0 } : m.reward,
  };
}

// RDF042 · mostrarVictoria: resultado de terminar (o confirmar) una misión
function toOutcomeDto({ sessionId, mission, validation, activity, claimed, profile }) {
  return {
    sessionId,
    mission: toMissionDto(mission),
    validation,
    ...(activity && { activity }),
    claimed,
    ...(profile && { profile }),
  };
}

module.exports = { toMissionDto, toSessionDto, toHistoryEntryDto, toOutcomeDto };
