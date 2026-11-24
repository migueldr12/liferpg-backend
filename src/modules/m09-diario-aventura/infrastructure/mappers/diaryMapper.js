const { utcToDateKey } = require('../../../../shared/utils/zonaHoraria');

// Traduce los documentos de MongoDB (enums en inglés) a las entidades del M09
// (vocabulario de la PWA). Ver el contrato en domain/repositories/diaryRepository.js.

const AREA = { CULTURE: 'cultura', PHYSICAL: 'fisico', FOCUS: 'enfoque' };
const DIFFICULTY = { EASY: 'facil', MEDIUM: 'media', HARD: 'dificil', EPIC: 'epica' };
const FREQUENCY = { DAILY: 'diario', WEEKLY: 'semanal' };
const VALIDATION = { FOCUS_LOCK: 'bloqueo', WEARABLE: 'smartwatch', MANUAL: 'manual' };

// La misión trae su última sesión (focusSessions ordenadas de la más reciente a la más antigua)
function toMission(doc) {
  if (!doc) return null;
  const last = doc.focusSessions?.[0];
  return {
    id: doc.id,
    title: doc.title,
    type: AREA[doc.area],
    durationMin: doc.estimatedMinutes,
    status: doc.status === 'COMPLETED' ? 'completada' : 'fallida',
    createdAt: doc.createdAt,
    completedAt: doc.completedAt ?? null,
    failedAt: doc.failedAt ?? null,
    xp: doc.xpAwarded,
    points: doc.pointsAwarded,
    validation: doc.validationMethod ? VALIDATION[doc.validationMethod] : null,
    failReason: last?.status === 'ABANDONED' ? last.abandonReason ?? null : null,
    sessionStartedAt: last?.startedAt ?? null,
  };
}

// La sesión trae su hábito (si es el enfoque de un hábito) para el título y el tipo
function toSession(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    type: doc.habit ? AREA[doc.habit.area] : 'enfoque',
    habitName: doc.habit?.name ?? null,
    plannedMinutes: doc.plannedMinutes,
    status: doc.status === 'COMPLETED' ? 'completada' : 'abandonada',
    startedAt: doc.startedAt,
    endedAt: doc.endedAt ?? null,
    xp: doc.xpAwarded,
    points: doc.pointsAwarded,
    abandonReason: doc.abandonReason ?? null,
  };
}

function toHabit(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    name: doc.name,
    type: AREA[doc.area],
    difficulty: DIFFICULTY[doc.difficulty] ?? null,
    frequency: FREQUENCY[doc.frequency] ?? 'diario',
    focusMinutes: doc.focusMinutes ?? null,
    active: doc.active,
    startsOn: doc.startsOn,
    archivedAt: doc.archivedAt ?? null,
  };
}

// El día del check-in es su periodStart (M02 guarda la medianoche UTC del día)
const toCheckIn = (doc) => ({
  id: doc.id,
  habitId: doc.habitId,
  dayKey: utcToDateKey(doc.periodStart),
  completedAt: doc.completedAt,
  xp: doc.xpAwarded,
  points: doc.pointsAwarded,
});

const toNote = (doc) =>
  doc && { id: doc.id, userId: doc.userId, activityId: doc.activityId, text: doc.text, createdAt: doc.createdAt, updatedAt: doc.updatedAt };

module.exports = { toMission, toSession, toHabit, toCheckIn, toNote };
