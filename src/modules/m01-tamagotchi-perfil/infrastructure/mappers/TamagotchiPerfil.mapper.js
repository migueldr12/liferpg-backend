const { PlayerProfileEntity } = require('../../domain/entities/PlayerProfile.entity');

class TamagotchiPerfilMapper {
  static toDomain(userDoc, profileDoc) {
    return new PlayerProfileEntity({
      id: profileDoc.id,
      userId: userDoc.id,
      displayName: userDoc.displayName,
      email: userDoc.email,
      alias: profileDoc.alias,
      mascotName: profileDoc.mascotName,
      mascotColor: profileDoc.mascotColor,
      avatarUrl: profileDoc.avatarUrl,
      darkMode: profileDoc.darkMode,
      level: profileDoc.level,
      xp: profileDoc.xp,
      hp: profileDoc.hp,
      culturePoints: profileDoc.culturePoints,
      physicalPoints: profileDoc.physicalPoints,
      focusPoints: profileDoc.focusPoints,
      currentStreak: profileDoc.currentStreak,
      bestStreak: profileDoc.bestStreak,
      createdAt: userDoc.createdAt,
    });
  }
}

module.exports = { TamagotchiPerfilMapper };