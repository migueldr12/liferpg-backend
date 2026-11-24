const { addDays, dateKeyToUtc, lunesDe, toDateKey, utcToDateKey } = require('../../../../shared/utils/zonaHoraria');

// Reglas del Diario de aventura (M09). Todo aquí es puro: recibe lo que el repositorio leyó
// de M02 (hábitos y check-ins) y M03 (misiones y sesiones) y arma las actividades del diario.
//
// Una actividad del diario:
//   { id, title, type, origin, status, at, durationMin, points, xp,
//     validation?, failReason?, difficulty?, frequency? }
// - id: "mision-<id>", "sesion-<id>" o "habito-<id del hábito>-<AAAA-MM-DD>" (el día del hábito,
//   o el lunes de su semana si es semanal). Las notas de seguimiento se guardan con ese id.
// - Los hábitos siguen los días de M02 (medianoche UTC); las gráficas agrupan en la zona del juego.

const TYPES = ['cultura', 'fisico', 'enfoque'];
const ORIGINS = ['habito', 'mision', 'sesion'];
const STATUSES = ['hecha', 'pendiente', 'fallida'];
const RANGES = ['semana', 'mes', 'anio'];

const DIFFICULTY_LABEL = { facil: 'Fácil', media: 'Media', dificil: 'Difícil', epica: 'Épica' };
const NOTE_MAX = 500;
// Días hacia atrás en los que se marcan los hábitos sin check-in cuando no hay filtro de fecha
const MISSED_LOOKBACK_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (date) => (date ? new Date(date).toISOString() : null);
const endOfUtcDay = (key) => new Date(dateKeyToUtc(key).getTime() + DAY_MS - 1);

// ── Ids ──

const ID_PATTERN = /^(?:(mision|sesion)-([a-f0-9]{24})|habito-([a-f0-9]{24})-(\d{4}-\d{2}-\d{2}))$/i;

function parseActivityId(id) {
  const m = typeof id === 'string' ? ID_PATTERN.exec(id) : null;
  if (!m) return null;
  if (m[1]) return { origin: m[1].toLowerCase(), refId: m[2].toLowerCase() };
  const key = m[4];
  if (utcToDateKey(dateKeyToUtc(key)) !== key) return null; // 2026-02-31 no existe
  return { origin: 'habito', refId: m[3].toLowerCase(), key };
}

// ── Misiones (M03) ──

function missionActivity(m) {
  const done = m.status === 'completada';
  return {
    id: `mision-${m.id}`,
    title: m.title,
    type: m.type,
    origin: 'mision',
    status: done ? 'hecha' : 'fallida',
    at: iso(done ? m.completedAt : m.failedAt),
    durationMin: m.durationMin,
    points: done ? m.points : 0,
    xp: done ? m.xp : 0,
    ...(done && m.validation && { validation: m.validation }),
    ...(!done && m.failReason && { failReason: m.failReason }),
  };
}

// ── Sesiones de enfoque sueltas (sin misión: las del enfoque de un hábito o libres) ──

function sessionActivity(s) {
  const done = s.status === 'completada';
  return {
    id: `sesion-${s.id}`,
    title: s.habitName ? `Sesión de enfoque · ${s.habitName}` : `Sesión de enfoque · ${s.plannedMinutes} min`,
    type: s.type ?? 'enfoque',
    origin: 'sesion',
    status: done ? 'hecha' : 'fallida',
    at: iso(s.endedAt ?? s.startedAt),
    durationMin: s.plannedMinutes,
    points: done ? s.points : 0,
    xp: done ? s.xp : 0,
    ...(!done && s.abandonReason && { failReason: s.abandonReason }),
  };
}

// ── Hábitos (M02) ──

const periodKeyOf = (habit, dayKey) => (habit.frequency === 'semanal' ? lunesDe(dayKey) : dayKey);
const periodDays = (habit) => (habit.frequency === 'semanal' ? 7 : 1);
const periodEnd = (habit, key) => endOfUtcDay(addDays(key, periodDays(habit) - 1));

// ¿Le tocaba hacerse en ese periodo? Desde que empezó y mientras siga activo (o hasta que se archivó)
function isScheduled(habit, key) {
  const startKey = periodKeyOf(habit, utcToDateKey(habit.startsOn));
  if (key < startKey) return false;
  if (habit.archivedAt) return key < periodKeyOf(habit, utcToDateKey(habit.archivedAt));
  return habit.active;
}

function habitActivity(habit, key, { checkIn, current }) {
  const base = {
    id: `habito-${habit.id}-${key}`,
    title: habit.name,
    type: habit.type,
    origin: 'habito',
    durationMin: habit.focusMinutes ?? null,
    difficulty: DIFFICULTY_LABEL[habit.difficulty] ?? null,
    frequency: habit.frequency,
  };
  if (checkIn) return { ...base, status: 'hecha', at: iso(checkIn.completedAt), points: checkIn.points, xp: checkIn.xp };
  return { ...base, status: current ? 'pendiente' : 'fallida', at: iso(periodEnd(habit, key)), points: 0, xp: 0 };
}

// Todas las actividades de un hábito: cada check-in, y los periodos sin check-in desde missedFromKey
function habitActivities(habit, checkIns, { todayKey, missedFromKey }) {
  const byPeriod = new Map();
  for (const c of checkIns) {
    const key = periodKeyOf(habit, c.dayKey);
    if (!byPeriod.has(key)) byPeriod.set(key, c);
  }
  const currentKey = periodKeyOf(habit, todayKey);
  const out = [...byPeriod].map(([key, checkIn]) => habitActivity(habit, key, { checkIn }));

  let key = periodKeyOf(habit, missedFromKey);
  while (key <= currentKey) {
    if (!byPeriod.has(key) && isScheduled(habit, key)) out.push(habitActivity(habit, key, { current: key === currentKey }));
    key = addDays(key, periodDays(habit));
  }
  return out;
}

// Una sola actividad de hábito (detalle por id); null si ese periodo no es parte del diario
function habitActivityAt(habit, key, checkIns, { todayKey }) {
  if (habit.frequency === 'semanal' && lunesDe(key) !== key) return null;
  const currentKey = periodKeyOf(habit, todayKey);
  if (key > currentKey) return null;
  const checkIn = checkIns.find((c) => periodKeyOf(habit, c.dayKey) === key);
  if (checkIn) return habitActivity(habit, key, { checkIn });
  if (!isScheduled(habit, key)) return null;
  return habitActivity(habit, key, { current: key === currentKey });
}

// ── Listado (RDF091 · RDF092) ──

function buildActivities({ missions, sessions, habits, checkIns, todayKey, missedFromKey }) {
  const byHabit = new Map(habits.map((h) => [h.id, []]));
  for (const c of checkIns) byHabit.get(c.habitId)?.push(c);
  return [
    ...missions.map(missionActivity),
    ...sessions.map(sessionActivity),
    ...habits.flatMap((h) => habitActivities(h, byHabit.get(h.id), { todayKey, missedFromKey })),
  ];
}

function filterAndSort(activities, { type, origin, status, since }) {
  const from = since ? since.getTime() : null;
  return activities
    .filter((a) => (!type || a.type === type) && (!origin || a.origin === origin) && (!status || a.status === status))
    .filter((a) => from == null || new Date(a.at).getTime() >= from)
    .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}

// ── Recorrido de una actividad (RDF093) ──

const VALIDATION_LABEL = {
  bloqueo: 'Completada con modo concentración',
  smartwatch: 'Validada con smartwatch',
  manual: 'Confirmada manualmente',
};
const FAIL_LABEL = { rendicion: 'Te rendiste · sin puntos', salio_app: 'Saliste de la app · sin puntos' };

function timelineOf(activity, { createdAt, startedAt } = {}) {
  const ok = activity.status === 'hecha';
  if (activity.origin === 'mision') {
    return [
      createdAt && { label: 'Creada', at: iso(createdAt), tone: 'bien' },
      startedAt && { label: activity.type === 'enfoque' ? 'Sesión de enfoque iniciada' : 'Sesión iniciada', at: iso(startedAt), tone: 'bien' },
      ok
        ? { label: VALIDATION_LABEL[activity.validation] ?? 'Completada', at: activity.at, tone: 'bien' }
        : { label: FAIL_LABEL[activity.failReason] ?? 'Fallida · sin puntos', at: activity.at, tone: 'mal' },
    ].filter(Boolean);
  }
  if (activity.origin === 'habito') {
    const weekly = activity.frequency === 'semanal';
    const end = ok
      ? { label: 'Check-in registrado', at: activity.at, tone: 'bien' }
      : activity.status === 'pendiente'
        ? { label: weekly ? 'Pendiente de check-in · cierra el domingo' : 'Pendiente de check-in · cierra hoy', at: null, tone: 'pendiente' }
        : { label: weekly ? 'Sin check-in al cierre de la semana' : 'Sin check-in al cierre del día', at: activity.at, tone: 'mal' };
    return [{ label: weekly ? 'Programado · una vez por semana' : 'Programado · todos los días', at: null, tone: 'bien' }, end];
  }
  return [
    startedAt && { label: 'Sesión iniciada', at: iso(startedAt), tone: 'bien' },
    ok
      ? { label: 'Completada sin salir de la app', at: activity.at, tone: 'bien' }
      : { label: FAIL_LABEL[activity.failReason] ?? 'Sesión sin terminar', at: activity.at, tone: 'mal' },
  ].filter(Boolean);
}

// ── Notas de seguimiento (RDF094 · RDF095) ──

const noteView = (n) => ({
  id: n.id,
  text: n.text,
  at: iso(n.createdAt),
  edited: new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime() > 1000,
});

// ── Gráficas (RDF096 · RDF097): solo cuentan las actividades cumplidas ──

const DAY_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABEL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Periodos de la gráfica, del más antiguo al de hoy: [{ key, label }] y el primer día
function chartPeriods(range, todayKey) {
  if (range === 'anio') {
    const [year, month] = todayKey.split('-').map(Number);
    const periods = Array.from({ length: month }, (_, i) => ({ key: `${year}-${String(i + 1).padStart(2, '0')}`, label: MONTH_LABEL[i] }));
    return { periods, firstDayKey: `${year}-01-01`, keyOf: (dayKey) => dayKey.slice(0, 7) };
  }
  const length = range === 'mes' ? 30 : 7;
  const periods = Array.from({ length }, (_, i) => {
    const key = addDays(todayKey, i - (length - 1));
    const d = dateKeyToUtc(key);
    const label = range === 'semana'
      ? (key === todayKey ? 'Hoy' : `${DAY_LABEL[d.getUTCDay()]} ${d.getUTCDate()}`)
      : (i % 5 === 0 || key === todayKey ? String(d.getUTCDate()) : '');
    return { key, label };
  });
  return { periods, firstDayKey: periods[0].key, keyOf: (dayKey) => dayKey };
}

function completionBuckets(activities, { periods, keyOf }, timeZone) {
  const rows = new Map(periods.map((p) => [p.key, { key: p.key, label: p.label, cultura: 0, fisico: 0, enfoque: 0 }]));
  for (const a of activities) {
    if (a.status !== 'hecha') continue;
    const row = rows.get(keyOf(toDateKey(new Date(a.at), timeZone)));
    if (row) row[a.type] += 1;
  }
  return [...rows.values()];
}

function distribution(buckets) {
  const totals = { cultura: 0, fisico: 0, enfoque: 0 };
  for (const b of buckets) for (const t of TYPES) totals[t] += b[t];
  return totals;
}

module.exports = {
  TYPES,
  ORIGINS,
  STATUSES,
  RANGES,
  NOTE_MAX,
  MISSED_LOOKBACK_DAYS,
  parseActivityId,
  missionActivity,
  sessionActivity,
  habitActivities,
  habitActivityAt,
  buildActivities,
  filterAndSort,
  timelineOf,
  noteView,
  chartPeriods,
  completionBuckets,
  distribution,
};
