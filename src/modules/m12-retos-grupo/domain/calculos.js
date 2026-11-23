// Cálculos del M12 sobre la actividad de los jugadores (funciones puras, sin base de datos).
//
// La actividad llega normalizada desde el ActivityRepository:
//   habits:    { id, userId, area, frequency: 'diario'|'semanal', active, startsOn, archivedAt }
//   checkIns:  { id, userId, habitId, completedAt, xp, points }        (sin los revertidos)
//   missions:  { id, userId, area, status: 'completada'|'fallida', at, xp, points }
//   sessions:  { id, userId, area, minutes, endedAt }                   (sesiones de enfoque completadas)
//
// Para no contar doble: la XP y los puntos de una misión se guardan también en su sesión
// de enfoque (M03), así que XP y puntos se toman SOLO de hábitos y misiones; de las
// sesiones solo se usan los minutos.

const { AREAS } = require('./entities/GroupChallenge');

const DIA_MS = 24 * 60 * 60 * 1000;

// RDF119 · Actividades válidas de UN participante para la métrica de un reto.
// Cada una lleva activityType + activityId (únicos por reto: no se suma dos veces).
function actividadesDelReto({ metric, area }, { habits, checkIns, missions, sessions }, userId) {
  const propio = (a) => a.userId === userId;
  const areaDe = new Map(habits.map((h) => [h.id, h.area]));
  const checks = checkIns.filter((c) => propio(c) && areaDe.get(c.habitId) === area);
  const done = missions.filter((m) => propio(m) && m.area === area && m.status === 'completada');
  sessions = sessions.filter(propio);

  switch (metric) {
    case 'habitos':
      return checks.map((c) => ({ activityType: 'habitCheckIn', activityId: c.id, value: 1 }));
    case 'misiones':
      return done.map((m) => ({ activityType: 'mission', activityId: m.id, value: 1 }));
    case 'minutos':
      return sessions
        .filter((s) => s.area === area && s.minutes > 0)
        .map((s) => ({ activityType: 'focusSession', activityId: s.id, value: s.minutes }));
    case 'xp':
      return [
        ...checks.map((c) => ({ activityType: 'habitCheckIn', activityId: c.id, value: c.xp })),
        ...done.map((m) => ({ activityType: 'mission', activityId: m.id, value: m.xp })),
      ].filter((a) => a.value > 0);
    default:
      return [];
  }
}

// Veces que un hábito debía cumplirse en [from, to).
// Un hábito pausado (inactivo y sin fecha de archivo) no suma esperados.
function vecesEsperadas(habit, from, to) {
  if (habit.active === false && !habit.archivedAt) return 0;
  const start = Math.max(from.getTime(), new Date(habit.startsOn).getTime());
  const end = Math.min(to.getTime(), habit.archivedAt ? new Date(habit.archivedAt).getTime() : Infinity);
  if (end <= start) return 0;
  const dias = Math.ceil((end - start) / DIA_MS);
  return habit.frequency === 'semanal' ? Math.ceil(dias / 7) : dias;
}

// RDF122 · Cumplimiento (%) de UN usuario por área en [from, to):
// (hábitos cumplidos + misiones completadas) / (hábitos esperados + misiones resueltas).
// null si en esa área no tenía nada que cumplir.
function cumplimientoPorArea(userId, { habits, checkIns, missions }, from, to) {
  const result = {};
  for (const area of AREAS) {
    const propios = habits.filter((h) => h.userId === userId && h.area === area);
    const ids = new Set(propios.map((h) => h.id));
    const esperados = propios.reduce((n, h) => n + vecesEsperadas(h, from, to), 0);
    const cumplidos = checkIns.filter((c) => c.userId === userId && ids.has(c.habitId)).length;
    const resueltas = missions.filter((m) => m.userId === userId && m.area === area);
    const completadas = resueltas.filter((m) => m.status === 'completada').length;

    const total = esperados + resueltas.length;
    result[area] = total ? Math.round(Math.min(1, (cumplidos + completadas) / total) * 100) : null;
  }
  return result;
}

// Promedio del grupo por área, solo con los amigos que tienen datos en esa área
function promedioGrupo(porAmigo) {
  const result = {};
  for (const area of AREAS) {
    const valores = porAmigo.map((c) => c[area]).filter((v) => v !== null);
    result[area] = valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : null;
  }
  return result;
}

// RDF124 · Puntos ganados por área (hábitos + misiones) de cada usuario
function puntosPorArea(userIds, { habits, checkIns, missions }) {
  const areaDe = new Map(habits.map((h) => [h.id, h.area]));
  const result = new Map(userIds.map((id) => [id, { cultura: 0, fisico: 0, enfoque: 0 }]));
  for (const c of checkIns) {
    const area = areaDe.get(c.habitId);
    if (area && result.has(c.userId)) result.get(c.userId)[area] += c.points;
  }
  for (const m of missions) {
    if (m.status === 'completada' && result.has(m.userId)) result.get(m.userId)[m.area] += m.points;
  }
  return result;
}

module.exports = { actividadesDelReto, vecesEsperadas, cumplimientoPorArea, promedioGrupo, puntosPorArea };
