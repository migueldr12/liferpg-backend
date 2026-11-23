class HabitosRepository {
  async getTodayHabitsWithCheckIns(userId, dayStart, dayEnd) {
    throw new Error('Método getTodayHabitsWithCheckIns no implementado');
  }

  async findHabitById(habitId) {
    throw new Error('Método findHabitById no implementado');
  }

  async createHabit(data) {
    throw new Error('Método createHabit no implementado');
  }

  async updateHabit(habitId, data) {
    throw new Error('Método updateHabit no implementado');
  }

  async archiveHabit(habitId) {
    throw new Error('Método archiveHabit no implementado');
  }

  async completeCheckIn({ userId, habit, dayStart, dayEnd, xpAwarded, pointsAwarded }) {
    throw new Error('Método completeCheckIn no implementado');
  }

  async revertCheckIn({ userId, habit, checkIn }) {
    throw new Error('Método revertCheckIn no implementado');
  }

  async getMonthCalendarData(userId, monthStart, monthEnd) {
    throw new Error('Método getMonthCalendarData no implementado');
  }
}

module.exports = { HabitosRepository };