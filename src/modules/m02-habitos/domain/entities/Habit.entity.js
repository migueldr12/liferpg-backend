//luego vemos si cambiamos los numeritos pero asi esta en el mockup 

const REWARDS_BY_DIFFICULTY = {
  EASY: { xp: 10, points: 10 },
  MEDIUM: { xp: 20, points: 20 },
  HARD: { xp: 40, points: 40 },
};

class HabitEntity {
  constructor({
    id,
    userId,
    categoryId = null,
    name,
    area,
    difficulty,
    frequency = 'DAILY',
    focusMinutes = null,
    penaltyType = 'HP',
    penaltyValue = 10,
    active = true,
    startsOn,
    archivedAt = null,
    createdAt,
  }) {
    this.id = id;
    this.userId = userId;
    this.categoryId = categoryId;
    this.name = name;
    this.area = area; 
    this.difficulty = difficulty; 
    this.frequency = frequency; 
    this.focusMinutes = focusMinutes;
    this.penaltyType = penaltyType;
    this.penaltyValue = penaltyValue;
    this.active = active;
    this.startsOn = startsOn;
    this.archivedAt = archivedAt;
    this.createdAt = createdAt;
  }

  getReward() {
    return REWARDS_BY_DIFFICULTY[this.difficulty] || REWARDS_BY_DIFFICULTY.EASY;
  }
}

module.exports = { HabitEntity, REWARDS_BY_DIFFICULTY };