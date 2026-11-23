const { notFound, conflict, forbidden } = require('../../../../shared/errors/AppError');

function getUtcDayBounds(dateInput) {
  const base = dateInput ? new Date(dateInput) : new Date();
  const dayStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0, 0));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}

class CheckInHabitoService {
  constructor(repository) {
    this.repository = repository;
  }

  async getTodayList(userId, dateQuery) {
    const { dayStart, dayEnd } = getUtcDayBounds(dateQuery);
    const { habits, checkIns } = await this.repository.getTodayHabitsWithCheckIns(userId, dayStart, dayEnd);

    const checkInMap = new Map(checkIns.map((c) => [c.habitId, c]));

    const items = habits.map((habit) => {
      const checkIn = checkInMap.get(habit.id) || null;
      const reward = habit.getReward();
      return {
        id: habit.id,
        name: habit.name,
        area: habit.area,
        difficulty: habit.difficulty,
        frequency: habit.frequency,
        focusMinutes: habit.focusMinutes,
        penaltyType: habit.penaltyType,
        penaltyValue: habit.penaltyValue,
        rewardPoints: reward.points,
        rewardXp: reward.xp,
        completed: Boolean(checkIn),
        completedAt: checkIn ? checkIn.completedAt : null,
      };
    });

    const completedCount = items.filter((i) => i.completed).length;

    return {
      dayStart,
      summary: {
        completed: completedCount,
        total: items.length,
        pending: items.length - completedCount,
      },
      habits: items,
    };
  }

  async checkIn(userId, habitId, dateBody) {
    const habit = await this.repository.findHabitById(habitId);
    if (!habit || habit.archivedAt) {
      throw notFound('No se encontró el hábito.');
    }
    if (habit.userId !== userId) {
      throw forbidden('No tienes permiso sobre este hábito.');
    }

    const { dayStart, dayEnd } = getUtcDayBounds(dateBody);
    const { checkIns } = await this.repository.getTodayHabitsWithCheckIns(userId, dayStart, dayEnd);

    const alreadyDone = checkIns.some((c) => c.habitId === habitId && !c.revertedAt);
    if (alreadyDone) {
      throw conflict('Este hábito ya fue marcado como cumplido hoy.');
    }

    const { xp, points } = habit.getReward();
    return this.repository.completeCheckIn({
      userId,
      habit,
      dayStart,
      dayEnd,
      xpAwarded: xp,
      pointsAwarded: points,
    });
  }

  async undoCheckIn(userId, habitId, dateQuery) {
    const habit = await this.repository.findHabitById(habitId);
    if (!habit) throw notFound('No se encontró el hábito.');
    if (habit.userId !== userId) throw forbidden('No tienes permiso sobre este hábito.');

    const { dayStart, dayEnd } = getUtcDayBounds(dateQuery);
    const { checkIns } = await this.repository.getTodayHabitsWithCheckIns(userId, dayStart, dayEnd);
    const activeCheckIn = checkIns.find((c) => c.habitId === habitId && !c.revertedAt);

    if (!activeCheckIn) {
      throw notFound('No hay un check-in activo para deshacer hoy.');
    }

    return this.repository.revertCheckIn({ userId, habit, checkIn: activeCheckIn });
  }
}

module.exports = { CheckInHabitoService, getUtcDayBounds };