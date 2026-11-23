const { notFound } = require('../../../../shared/errors/AppError');

class GetHudPrincipalService {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId) {
    const data = await this.repository.getHudData(userId);
    if (!data) {
      throw notFound('No se encontró el perfil del jugador.');
    }

    const { profile, activeOutfit, latestMood } = data;

    return {
      user: {
        id: profile.userId,
        displayName: profile.displayName,
        email: profile.email,
        alias: profile.alias,
        avatarUrl: profile.avatarUrl,
        darkMode: profile.darkMode,
        memberSince: profile.createdAt,
      },
      tamagotchi: {
        name: profile.mascotName,
        color: profile.mascotColor,
        level: profile.level,
        xp: profile.xp,
        nextLevelXp: profile.getNextLevelXp(),
        xpProgressPercent: profile.getXpProgressPercent(),
        hp: profile.hp,
        maxHp: 100,
        moodLabel: profile.getMoodLabel(),
        latestMoodScore: latestMood ? latestMood.mood : null,
        activeOutfit: activeOutfit
          ? {
              id: activeOutfit.id,
              name: activeOutfit.name,
              equipped: activeOutfit.equipped,
            }
          : null,
      },
      stats: {
        culturePoints: profile.culturePoints,
        physicalPoints: profile.physicalPoints,
        focusPoints: profile.focusPoints,
        currentStreak: profile.currentStreak,
        bestStreak: profile.bestStreak,
      },
    };
  }
}

module.exports = { GetHudPrincipalService };