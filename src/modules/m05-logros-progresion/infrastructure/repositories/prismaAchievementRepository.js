const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

function createPrismaAchievementRepository(db = getPrisma) {
  return {
    listForUser(userId) {
      return db().achievement.findMany({
        where: { active: true },
        include: {
          userAchievements: {
            where: { userId },
            select: { progress: true, unlockedAt: true, claimedAt: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    },
  };
}

module.exports = { createPrismaAchievementRepository };
