const { HabitEntity } = require('../../domain/entities/Habit.entity');

class HabitMapper {
  static toDomain(doc) {
    return new HabitEntity({
      id: doc.id,
      userId: doc.userId,
      categoryId: doc.categoryId,
      name: doc.name,
      area: doc.area,
      difficulty: doc.difficulty,
      frequency: doc.frequency,
      focusMinutes: doc.focusMinutes,
      penaltyType: doc.penaltyType,
      penaltyValue: doc.penaltyValue,
      active: doc.active,
      startsOn: doc.startsOn,
      archivedAt: doc.archivedAt,
      createdAt: doc.createdAt,
    });
  }
}

module.exports = { HabitMapper };