const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { HabitosRepository } = require('../../domain/repositories/HabitosRepository');
const { HabitMapper } = require('../mappers/Habit.mapper');

const AREA_FIELD_MAP = {
  CULTURE: 'culturePoints',
  PHYSICAL: 'physicalPoints',
  FOCUS: 'focusPoints',
};

class PrismaHabitosRepository extends HabitosRepository {
  async getTodayHabitsWithCheckIns(userId, dayStart, dayEnd) {
    const prisma = getPrisma();
    const [habits, checkIns] = await Promise.all([
      prisma.habit.findMany({
        where: { userId, active: true, archivedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.habitCheckIn.findMany({
        where: {
          userId,
          periodStart: { gte: dayStart, lt: dayEnd },
          revertedAt: null,
        },
      }),
    ]);

    return {
      habits: habits.map(HabitMapper.toDomain),
      checkIns,
    };
  }

  async findHabitById(habitId) {
    const prisma = getPrisma();
    const doc = await prisma.habit.findUnique({ where: { id: habitId } });
    return doc ? HabitMapper.toDomain(doc) : null;
  }

  async createHabit(data) {
    const prisma = getPrisma();
    const created = await prisma.habit.create({ data });
    return HabitMapper.toDomain(created);
  }

  async updateHabit(habitId, data) {
    const prisma = getPrisma();
    const updated = await prisma.habit.update({
      where: { id: habitId },
      data,
    });
    return HabitMapper.toDomain(updated);
  }

  async archiveHabit(habitId) {
    const prisma = getPrisma();
    return prisma.habit.update({
      where: { id: habitId },
      data: { active: false, archivedAt: new Date() },
    });
  }

  async completeCheckIn({ userId, habit, dayStart, dayEnd, xpAwarded, pointsAwarded }) {
    const prisma = getPrisma();
    const pointField = AREA_FIELD_MAP[habit.area];

    // Buscar si ya existe un registro previo (incluso revertido) para ese día UTC
    const existing = await prisma.habitCheckIn.findUnique({
      where: {
        habitId_periodStart: {
          habitId: habit.id,
          periodStart: dayStart,
        },
      },
    });

    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    let newXp = (profile?.xp || 0) + xpAwarded;
    let newLevel = profile?.level || 1;
    let nextLevelXp = Math.round(100 * Math.pow(newLevel, 1.07));

    while (newXp >= nextLevelXp) {
      newXp -= nextLevelXp;
      newLevel += 1;
      nextLevelXp = Math.round(100 * Math.pow(newLevel, 1.07));
    }

    const [checkIn, updatedProfile] = await prisma.$transaction([
      existing
        ? prisma.habitCheckIn.update({
            where: { id: existing.id },
            data: {
              revertedAt: null,
              completedAt: new Date(),
              xpAwarded,
              pointsAwarded,
            },
          })
        : prisma.habitCheckIn.create({
            data: {
              userId,
              habitId: habit.id,
              periodStart: dayStart,
              periodEnd: dayEnd,
              xpAwarded,
              pointsAwarded,
            },
          }),
      prisma.playerProfile.update({
        where: { userId },
        data: {
          xp: newXp,
          level: newLevel,
          [pointField]: { increment: pointsAwarded },
        },
      }),
    ]);

    return { checkIn, profile: updatedProfile };
  }

  async revertCheckIn({ userId, habit, checkIn }) {
    const prisma = getPrisma();
    const pointField = AREA_FIELD_MAP[habit.area];
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });

    const safeXp = Math.max(0, (profile?.xp || 0) - checkIn.xpAwarded);
    const safePoints = Math.max(0, (profile?.[pointField] || 0) - checkIn.pointsAwarded);

    const [reverted, updatedProfile] = await prisma.$transaction([
      prisma.habitCheckIn.update({
        where: { id: checkIn.id },
        data: { revertedAt: new Date() },
      }),
      prisma.playerProfile.update({
        where: { userId },
        data: {
          xp: safeXp,
          [pointField]: safePoints,
        },
      }),
    ]);

    return { checkIn: reverted, profile: updatedProfile };
  }

  async getMonthCalendarData(userId, monthStart, monthEnd) {
    const prisma = getPrisma();
    const [profile, habits, checkIns] = await Promise.all([
      prisma.playerProfile.findUnique({ where: { userId } }),
      prisma.habit.findMany({
        where: { userId, active: true, archivedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.habitCheckIn.findMany({
        where: {
          userId,
          periodStart: { gte: monthStart, lt: monthEnd },
          revertedAt: null,
        },
        orderBy: { periodStart: 'asc' },
      }),
    ]);

    return {
      profile,
      habits: habits.map(HabitMapper.toDomain),
      checkIns,
    };
  }
}

module.exports = { PrismaHabitosRepository };