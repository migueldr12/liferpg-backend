const { notFound } = require('../../../../shared/errors/AppError');

class GetCalendarioRachasService {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId, { year, month }) {
    const now = new Date();
    const targetYear = Number(year) || now.getUTCFullYear();
    const targetMonth = Number(month) || now.getUTCMonth() + 1; // 1-12

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
    const daysInMonth = Math.round((monthEnd - monthStart) / (24 * 60 * 60 * 1000));

    const { profile, habits, checkIns } = await this.repository.getMonthCalendarData(
      userId,
      monthStart,
      monthEnd
    );

    if (!profile) {
      throw notFound('No se encontró el perfil del usuario.');
    }

    const todayKey = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      .toISOString()
      .slice(0, 10);

    // Agrupar check-ins por día YYYY-MM-DD
    const byDay = new Map();
    for (const ci of checkIns) {
      const key = new Date(ci.periodStart).toISOString().slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(ci);
    }

    const totalHabits = habits.length;
    const days = [];
    let completedDaysCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(Date.UTC(targetYear, targetMonth - 1, d));
      const dateKey = dateObj.toISOString().slice(0, 10);
      const dayCheckIns = byDay.get(dateKey) || [];
      const count = dayCheckIns.length;

      let status = 'FUTURE';
      if (dateKey === todayKey) {
        status = count >= totalHabits && totalHabits > 0 ? 'COMPLETO' : 'HOY';
      } else if (dateKey < todayKey) {
        if (totalHabits > 0 && count >= totalHabits) status = 'COMPLETO';
        else if (count > 0) status = 'PARCIAL';
        else status = 'FALLIDO';
      }

      if (status === 'COMPLETO') completedDaysCount += 1;

      days.push({
        day: d,
        date: dateKey,
        completedCount: count,
        totalHabits,
        status, // COMPLETO | PARCIAL | FALLIDO | HOY | FUTURE
      });
    }

    // Racha por hábito individual en el mes
    const habitStreaks = habits.map((habit) => {
      const count = checkIns.filter((c) => c.habitId === habit.id).length;
      return {
        habitId: habit.id,
        name: habit.name,
        area: habit.area,
        completedDaysInMonth: count,
      };
    });

    return {
      year: targetYear,
      month: targetMonth,
      streakSummary: {
        currentStreak: profile.currentStreak,
        bestStreak: profile.bestStreak,
        completedDaysInMonth: completedDaysCount,
        daysInMonth,
      },
      days,
      habitStreaks,
    };
  }
}

module.exports = { GetCalendarioRachasService };