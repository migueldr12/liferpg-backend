// Reglas de negocio del M03 (Misiones únicas y enfoque). Sin Express ni base de datos.
// Los valores usan el mismo vocabulario que la app móvil.

const MISSION_TYPES = ['cultura', 'fisico', 'enfoque'];

const MISSION_STATUS = {
  ACTIVE: 'activa',
  COMPLETED: 'completada',
  FAILED: 'fallida',
};

const SESSION_STATUS = {
  RUNNING: 'en_curso',
  COMPLETED: 'completada',
  ABANDONED: 'abandonada',
};

// Cómo se comprobó que la misión se cumplió (RDF041, RDF043)
const VALIDATION = {
  LOCK: 'bloqueo',
  WEARABLE: 'smartwatch',
  MANUAL: 'manual',
};

// Por qué una sesión terminó como fallida (RDF040)
const FAIL_REASONS = ['rendicion', 'salio_app'];

const LIMITS = {
  titleMax: 80,
  durationMin: 5,
  durationMax: 240,
};

// RDF038 · calcularRecompensaMision: la XP y los puntos dependen de la duración.
// Los puntos son del tipo de la misión (Cultura, Físicos o Enfoque).
function rewardFor(type, durationMin) {
  if (!MISSION_TYPES.includes(type)) throw new Error(`Tipo de misión desconocido: ${type}`);
  return { xp: Math.round(durationMin * 1.2), points: durationMin };
}

// Solo las misiones de Enfoque fijan la pantalla del celular (RDF039)
const locksDevice = (type) => type === 'enfoque';

// Datos del reloj que cuentan como actividad real
const isValidActivity = (activity) =>
  !!activity && activity.steps > 0 && activity.activeMin > 0 && activity.distanceKm >= 0;

// Al terminar el temporizador (RDF041): Enfoque se valida con el bloqueo; Física con el
// smartwatch si llegaron datos; lo demás espera la confirmación manual (RDF043).
function validationOnFinish(type, activity) {
  if (type === 'enfoque') return VALIDATION.LOCK;
  if (type === 'fisico' && isValidActivity(activity)) return VALIDATION.WEARABLE;
  return VALIDATION.MANUAL;
}

// ¿Ya pasó el tiempo planeado? Se tolera un minuto por la latencia de la red.
function hasReachedPlannedTime(session, now, toleranceMs = 60_000) {
  const elapsed = now.getTime() - new Date(session.startedAt).getTime();
  return elapsed + toleranceMs >= session.plannedMinutes * 60_000;
}

module.exports = {
  MISSION_TYPES,
  MISSION_STATUS,
  SESSION_STATUS,
  VALIDATION,
  FAIL_REASONS,
  LIMITS,
  rewardFor,
  locksDevice,
  isValidActivity,
  validationOnFinish,
  hasReachedPlannedTime,
};
