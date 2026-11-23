// Contrato del repositorio del M03. Los servicios solo dependen de estas operaciones;
// la implementación con Prisma vive en infrastructure/repositories y las pruebas usan
// una en memoria. Todas reciben y devuelven entidades del dominio (ver mappers).
//
// Misión:  { id, userId, title, type, durationMin, status, reward: { xp, points },
//            validation, activity, createdAt, completedAt, failedAt, failReason }
// Sesión:  { id, userId, missionId, plannedMinutes, status, startedAt, endedAt, abandonReason }
//
// listActive(userId, { type })                       → Misión[] activas, recientes primero
// findMission(userId, missionId)                     → Misión | null
// createMission({ userId, title, type, durationMin }) → Misión
// listHistory(userId, { status, type, from, to, limit }) → Misión[] completadas o fallidas
// findRunningSession(userId)                         → Sesión | null
// findSession(userId, sessionId)                     → Sesión | null
// hasCompletedSession(missionId)                     → boolean
// startSession({ userId, missionId, plannedMinutes, at }) → Sesión
// abandonSession({ sessionId, missionId, reason, at })    → { mission, session }
//     (sesión abandonada y misión fallida, en una sola transacción)
// completeSession({ sessionId, at })                 → Sesión
// completeMission({ userId, missionId, sessionId, validation, activity, reward, at })
//     → { mission, profile }  (misión completada y puntos al perfil, en una transacción)

const REQUIRED = [
  'listActive', 'findMission', 'createMission', 'listHistory', 'findRunningSession', 'findSession',
  'hasCompletedSession', 'startSession', 'abandonSession', 'completeSession', 'completeMission',
];

// Falla al arrancar si una implementación olvida una operación
function assertMissionRepository(repo) {
  const missing = REQUIRED.filter((name) => typeof repo?.[name] !== 'function');
  if (missing.length) throw new Error(`El repositorio de misiones no implementa: ${missing.join(', ')}`);
  return repo;
}

module.exports = { assertMissionRepository };
