const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

const OWN_PROGRESS = { progress: true, unlockedAt: true, claimedAt: true };

// Campo de player_profiles que guarda cada tipo de punto del móvil
const POINT_FIELDS = { cultura: 'culturePoints', fisico: 'physicalPoints', enfoque: 'focusPoints' };

const toWallet = (profile) => ({
  cultura: profile?.culturePoints ?? 0,
  fisico: profile?.physicalPoints ?? 0,
  enfoque: profile?.focusPoints ?? 0,
});

function createPrismaAchievementRepository(db = getPrisma) {
  // Logro activo + avance de este usuario, con la misma forma que listForUser
  // (userAchievements: [] o [propio]). Sin `include` para que funcione con cualquier cliente.
  async function findForUser(id, userId, client = db()) {
    const achievement = await client.achievement.findUnique({ where: { id } });
    if (!achievement || !achievement.active) return null;
    const own = await client.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: id } },
      select: { id: true, ...OWN_PROGRESS },
    });
    return { ...achievement, userAchievements: own ? [own] : [] };
  }

  return {
    listForUser(userId) {
      return db().achievement.findMany({
        where: { active: true },
        include: { userAchievements: { where: { userId }, select: OWN_PROGRESS } },
        orderBy: { createdAt: 'asc' },
      });
    },

    findForUser: (id, userId) => findForUser(id, userId),

    // RDF064 · marca la recompensa como reclamada y suma los puntos en una sola transacción.
    // `check(achievement)` valida (desbloqueado, no reclamado) y devuelve { pointType, points }.
    claim(id, userId, now, check) {
      return db().$transaction(async (tx) => {
        const achievement = await findForUser(id, userId, tx);
        const { pointType, points } = check(achievement);
        const own = achievement.userAchievements[0];
        await tx.userAchievement.update({ where: { id: own.id }, data: { claimedAt: now } });

        const field = POINT_FIELDS[pointType];
        const profile = points > 0 && field
          ? await tx.playerProfile.update({ where: { userId }, data: { [field]: { increment: points } } })
          : await tx.playerProfile.findUnique({ where: { userId } });

        return {
          achievement: { ...achievement, userAchievements: [{ ...own, claimedAt: now }] },
          wallet: toWallet(profile),
        };
      });
    },
  };
}

module.exports = { createPrismaAchievementRepository, toWallet, POINT_FIELDS };
