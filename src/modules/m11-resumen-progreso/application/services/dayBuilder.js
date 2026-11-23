const { evaluateDay } = require('../../domain/entities/dayProgress');
const { addDays, dateKeyOf, startOfLocalDay } = require('../../../../shared/utils/localDay');

// Arma el resultado de cada día local entre `from` y `to` (inclusive, ambos inicios de día).
// Carga hábitos, check-ins y cierres UNA vez y calcula en memoria.
// - Días ya cerrados (anteriores a hoy) con un cierre guardado usan los números del cierre
//   (la "foto" no se recalcula si luego cambian las reglas).
// - Días cerrados sin cierre se calculan y, con persist, se guardan en daily_closures.
// - Hoy siempre se calcula en vivo.
async function buildDays({ repo, userId, from, to, utcOffset, now, persist = false, clampToFirstHabit = false }) {
  const habits = await repo.listHabits(userId);
  let start = from;
  if (clampToFirstHabit) {
    if (!habits.length) return [];
    const first = startOfLocalDay(new Date(Math.min(...habits.map((h) => h.startsOn.getTime()))), utcOffset);
    if (first > start) start = first;
  }
  if (start > to) return [];

  const rangeEnd = addDays(to, 1);
  // 6 días antes: un hábito semanal se cumple con un check-in de cualquier día de su semana.
  const [checkIns, closures] = await Promise.all([
    repo.listCheckIns(userId, addDays(start, -6), rangeEnd),
    repo.listClosures(userId, start, rangeEnd),
  ]);
  const closureByDay = new Map(closures.map((c) => [c.dayStart.getTime(), c]));
  const todayStart = startOfLocalDay(now, utcOffset);

  const days = [];
  const toSave = [];
  for (let d = start; d <= to; d = addDays(d, 1)) {
    const live = evaluateDay({ habits, checkIns, dayStart: d, utcOffset });
    const closed = d < todayStart;
    const closure = closed ? closureByDay.get(d.getTime()) : undefined;

    const numbers = closure
      ? {
        habitsDue: closure.habitsDue,
        habitsCompleted: closure.habitsCompleted,
        pendingCount: closure.pendingCount,
        completionRate: closure.habitsDue > 0 ? closure.completionRate : null,
        penaltiesApplied: closure.penaltiesApplied,
      }
      : { penaltiesApplied: 0 };

    if (closed && !closure && live.habitsDue > 0) toSave.push(live);
    days.push({ ...live, ...numbers, date: dateKeyOf(d, utcOffset), closed });
  }

  if (persist && toSave.length) {
    // Guardar el cierre es un efecto secundario: si falla (p. ej. otra petición lo creó
    // al mismo tiempo) la consulta no debe fallar.
    const results = await Promise.allSettled(toSave.map((day) => repo.saveClosure(userId, day)));
    results.filter((r) => r.status === 'rejected' && r.reason?.code !== 'P2002')
      .forEach((r) => console.warn('[M11] No se pudo guardar el cierre diario:', r.reason?.message));
  }
  return days;
}

module.exports = { buildDays };
