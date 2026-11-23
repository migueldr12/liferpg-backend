// Documento de MongoDB/Prisma -> objeto plano que usa el dominio.
// En MongoDB un campo opcional puede faltar en el documento (no solo ser null),
// por eso todo se normaliza a null aquí.
const toHabit = (d) => ({
  id: String(d.id),
  name: d.name,
  area: d.area,
  difficulty: d.difficulty,
  frequency: d.frequency,
  penaltyType: d.penaltyType,
  penaltyValue: d.penaltyValue ?? 0,
  active: d.active !== false,
  startsOn: d.startsOn,
  archivedAt: d.archivedAt ?? null,
  updatedAt: d.updatedAt ?? null,
});

const toCheckIn = (d) => ({
  id: String(d.id),
  habitId: String(d.habitId),
  periodStart: d.periodStart,
  periodEnd: d.periodEnd,
  revertedAt: d.revertedAt ?? null,
});

const toMission = (d) => ({
  id: String(d.id),
  title: d.title,
  area: d.area,
  estimatedMinutes: d.estimatedMinutes,
  status: d.status,
  createdAt: d.createdAt,
  completedAt: d.completedAt ?? null,
  failedAt: d.failedAt ?? null,
});

const toClosure = (d) => ({
  dayStart: d.dayStart,
  habitsDue: d.habitsDue ?? 0,
  habitsCompleted: d.habitsCompleted ?? 0,
  completionRate: d.completionRate ?? 0,
  pendingCount: d.pendingCount ?? 0,
  penaltiesApplied: d.penaltiesApplied ?? 0,
});

const toUser = (d) => (d ? { id: String(d.id), status: d.status, deletedAt: d.deletedAt ?? null } : null);
const toProfile = (d) => (d ? { currentStreak: d.currentStreak ?? 0, bestStreak: d.bestStreak ?? 0 } : null);

module.exports = { toHabit, toCheckIn, toMission, toClosure, toUser, toProfile };
