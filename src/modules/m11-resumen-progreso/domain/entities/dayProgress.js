const { addDays, localWeekday } = require('../../../../shared/utils/localDay');

// Reglas de negocio puras del cumplimiento diario (sin Express ni Prisma).
// Un día local es [dayStart, dayStart + 24 h).

const round2 = (n) => Math.round(n * 100) / 100;

// Cuándo dejó de estar vigente un hábito: archivado, o desactivado (se usa updatedAt).
const habitEndsAt = (habit) => habit.archivedAt ?? (habit.active ? null : habit.updatedAt);

// ¿El hábito se debía cumplir ese día?
// - DAILY: todos los días desde que empezó.
// - WEEKLY: se evalúa al cierre de su semana (domingo local); la semana va de lunes a domingo.
function isDue(habit, dayStart, utcOffset) {
  const dayEnd = addDays(dayStart, 1);
  if (habit.startsOn >= dayEnd) return false;
  const endsAt = habitEndsAt(habit);
  if (endsAt && endsAt < dayEnd) return false;
  return habit.frequency === 'WEEKLY' ? localWeekday(dayStart, utcOffset) === 0 : true;
}

// Evalúa un día. `checkIns` son los de ese usuario (puede incluir otros días);
// los revertidos no cuentan.
function evaluateDay({ habits, checkIns, dayStart, utcOffset }) {
  const dayEnd = addDays(dayStart, 1);
  const valid = checkIns.filter((c) => !c.revertedAt);
  const pendingHabits = [];
  let habitsDue = 0;
  let habitsCompleted = 0;

  for (const habit of habits) {
    if (!isDue(habit, dayStart, utcOffset)) continue;
    habitsDue += 1;
    const windowStart = habit.frequency === 'WEEKLY' ? addDays(dayStart, -6) : dayStart;
    const completed = valid.some(
      (c) => c.habitId === habit.id && c.periodStart >= windowStart && c.periodStart < dayEnd,
    );
    if (completed) habitsCompleted += 1;
    else pendingHabits.push(habit);
  }

  return {
    dayStart,
    dayEnd,
    habitsDue,
    habitsCompleted,
    pendingCount: pendingHabits.length,
    completionRate: habitsDue > 0 ? round2((habitsCompleted / habitsDue) * 100) : null,
    pendingHabits,
    // Check-ins vigentes del día (cualquier frecuencia): base de la racha.
    checkIns: valid.filter((c) => c.periodStart >= dayStart && c.periodStart < dayEnd).length,
  };
}

// Misiones que seguían sin completarse al cierre del día (incluye las que vencieron ese día).
function listPendingMissions(missions, dayStart) {
  const dayEnd = addDays(dayStart, 1);
  return missions
    .filter((m) => m.createdAt < dayEnd
      && !(m.status === 'COMPLETED' && !m.completedAt)
      && (!m.completedAt || m.completedAt >= dayEnd)
      && (!m.failedAt || m.failedAt >= dayStart))
    .map((m) => ({ ...m, state: m.failedAt && m.failedAt < dayEnd ? 'FAILED' : 'PENDING' }));
}

module.exports = { evaluateDay, listPendingMissions, isDue };
