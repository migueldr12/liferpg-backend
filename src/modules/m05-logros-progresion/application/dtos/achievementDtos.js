const { catalog } = require('../../domain/entities/achievementCatalog');

// Traduce la definición y el progreso del usuario al modelo Achievement del móvil.
function toAchievementDto(achievement) {
  const meta = catalog[achievement.code];
  if (!meta) throw new Error(`Faltan metadatos del logro ${achievement.code}.`);

  const own = achievement.userAchievements[0];
  return {
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    icon: meta.icon,
    rarity: meta.rarity,
    area: meta.area,
    current: own?.progress ?? 0,
    target: achievement.threshold,
    unit: meta.unit,
    conditions: meta.conditions,
    unlockedAt: own?.unlockedAt?.toISOString() ?? null,
    reward: achievement.rewardPoints > 0
      ? { points: achievement.rewardPoints, pointType: meta.pointType, item: meta.item }
      : null,
    claimed: Boolean(own?.claimedAt),
  };
}

module.exports = { toAchievementDto };
