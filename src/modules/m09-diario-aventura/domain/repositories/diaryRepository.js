// Contrato del repositorio del M09. Los servicios solo dependen de estas operaciones;
// la implementación con Prisma vive en infrastructure/repositories y las pruebas usan
// una en memoria. El M09 solo LEE lo de M02 y M03; lo único que escribe son sus notas.
//
// Misión:  { id, title, type, durationMin, status: 'completada'|'fallida', createdAt, completedAt,
//            failedAt, xp, points, validation, failReason, sessionStartedAt }
// Sesión:  { id, type, habitName, plannedMinutes, status: 'completada'|'abandonada',
//            startedAt, endedAt, xp, points, abandonReason }   (solo sesiones sin misión)
// Hábito:  { id, name, type, difficulty, frequency: 'diario'|'semanal', focusMinutes,
//            active, startsOn, archivedAt }
// Check-in: { id, habitId, dayKey: 'AAAA-MM-DD' (día de M02), completedAt, xp, points }  (sin revertidos)
// Nota:    { id, userId, activityId, text, createdAt, updatedAt }
//
// listMissions(userId, { from })        → Misión[] terminadas desde "from" (o todas)
// findMission(userId, missionId)        → Misión | null  (solo terminadas)
// listSessions(userId, { from })        → Sesión[] terminadas desde "from" (o todas)
// findSession(userId, sessionId)        → Sesión | null
// listHabits(userId)                    → Hábito[] (incluye archivados)
// findHabit(userId, habitId)            → Hábito | null
// listCheckIns(userId, { from, habitId }) → Check-in[] con día >= "from" (AAAA-MM-DD, opcional)
// listNotes(userId, activityId)         → Nota[] de la más reciente a la más antigua
// findNote(userId, noteId)              → Nota | null
// createNote({ userId, origin, activityId, text, at }) → Nota
// updateNote({ noteId, text, at })      → Nota
// deleteNote(noteId)                    → void

const REQUIRED = [
  'listMissions', 'findMission', 'listSessions', 'findSession', 'listHabits', 'findHabit',
  'listCheckIns', 'listNotes', 'findNote', 'createNote', 'updateNote', 'deleteNote',
];

// Falla al arrancar si una implementación olvida una operación
function assertDiaryRepository(repo) {
  const missing = REQUIRED.filter((name) => typeof repo?.[name] !== 'function');
  if (missing.length) throw new Error(`El repositorio del M09 no implementa: ${missing.join(', ')}`);
  return repo;
}

module.exports = { assertDiaryRepository };
