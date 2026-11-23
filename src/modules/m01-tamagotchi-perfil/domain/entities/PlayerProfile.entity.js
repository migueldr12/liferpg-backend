class PlayerProfileEntity {
  constructor({
    id,
    userId,
    displayName,
    email,
    alias,
    mascotName,
    mascotColor,
    avatarUrl = null,
    darkMode = true,
    level = 1,
    xp = 0,
    hp = 100,
    culturePoints = 0,
    physicalPoints = 0,
    focusPoints = 0,
    currentStreak = 0,
    bestStreak = 0,
    createdAt,
  }) {
    this.id = id;
    this.userId = userId;
    this.displayName = displayName;
    this.email = email;
    this.alias = alias;
    this.mascotName = mascotName;
    this.mascotColor = mascotColor;
    this.avatarUrl = avatarUrl;
    this.darkMode = darkMode;
    this.level = level;
    this.xp = xp;
    this.hp = Math.max(0, Math.min(100, hp));
    this.culturePoints = culturePoints;
    this.physicalPoints = physicalPoints;
    this.focusPoints = focusPoints;
    this.currentStreak = currentStreak;
    this.bestStreak = bestStreak;
    this.createdAt = createdAt;
  }

  getNextLevelXp() {
    return Math.round(100 * Math.pow(this.level, 1.07));
  }

  getXpProgressPercent() {
    const nextXp = this.getNextLevelXp();
    if (nextXp <= 0) return 0;
    return Math.min(100, Math.round((this.xp / nextXp) * 100));
  }

  getMoodLabel() {
    if (this.hp >= 70) return 'Feliz';
    if (this.hp >= 35) return 'Cansado';
    return 'En peligro';
  }
}

module.exports = { PlayerProfileEntity };