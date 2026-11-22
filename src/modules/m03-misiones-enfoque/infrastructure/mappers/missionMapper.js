const { MISSION_STATUS, SESSION_STATUS, VALIDATION } = require('../../domain/entities/Mission');

// Traduce entre los documentos de MongoDB (enums en inglés) y las entidades del dominio
// (vocabulario de la app móvil).

const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));

const AREA = { CULTURE: 'cultura', PHYSICAL: 'fisico', FOCUS: 'enfoque' };
const STATUS = { PENDING: MISSION_STATUS.ACTIVE, COMPLETED: MISSION_STATUS.COMPLETED, FAILED: MISSION_STATUS.FAILED };
const FOCUS = { RUNNING: SESSION_STATUS.RUNNING, COMPLETED: SESSION_STATUS.COMPLETED, ABANDONED: SESSION_STATUS.ABANDONED };
const CHECK = { FOCUS_LOCK: VALIDATION.LOCK, WEARABLE: VALIDATION.WEARABLE, MANUAL: VALIDATION.MANUAL };

const toDb = {
  area: invert(AREA),
  status: invert(STATUS),
  focus: invert(FOCUS),
  validation: invert(CHECK),
};

// Columna del perfil que recibe los puntos de cada tipo
const PROFILE_POINTS = { cultura: 'culturePoints', fisico: 'physicalPoints', enfoque: 'focusPoints' };

function toMission(doc) {
  if (!doc) return null;
  const lastSession = doc.focusSessions?.[0];
  return {
    id: doc.id,
    userId: doc.userId,
    title: doc.title,
    type: AREA[doc.area],
    durationMin: doc.estimatedMinutes,
    status: STATUS[doc.status],
    reward: { xp: doc.xpAwarded, points: doc.pointsAwarded },
    validation: doc.validationMethod ? CHECK[doc.validationMethod] : null,
    activity: doc.wearableActivity ?? null,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt ?? null,
    failedAt: doc.failedAt ?? null,
    failReason: lastSession?.status === 'ABANDONED' ? lastSession.abandonReason ?? null : null,
  };
}

function toSession(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    userId: doc.userId,
    missionId: doc.missionId,
    plannedMinutes: doc.plannedMinutes,
    status: FOCUS[doc.status],
    startedAt: doc.startedAt,
    endedAt: doc.endedAt ?? null,
    abandonReason: doc.abandonReason ?? null,
  };
}

function toProfilePoints(doc) {
  if (!doc) return null;
  return { xp: doc.xp, culturePoints: doc.culturePoints, physicalPoints: doc.physicalPoints, focusPoints: doc.focusPoints };
}

module.exports = { toMission, toSession, toProfilePoints, toDb, PROFILE_POINTS };
