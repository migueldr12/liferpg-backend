const { SocialRepository } = require('../../domain/repositories/RetosRepository');

// Amigos (friendships aceptadas, M07) y datos públicos de cada jugador
// (users.displayName + player_profiles: alias, color de la mascota y nivel).

const COLOR_POR_DEFECTO = '#9c27b0';

class PrismaSocialRepository extends SocialRepository {
  /** @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient) }} options */
  constructor({ db }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  async findFriendIds(userId) {
    const rows = await this.db.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    return [...new Set(rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)))];
  }

  async findPeople(userIds) {
    if (!userIds.length) return [];
    const [users, profiles] = await Promise.all([
      this.db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } }),
      this.db.playerProfile.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, alias: true, mascotColor: true, level: true },
      }),
    ]);
    const perfil = new Map(profiles.map((p) => [p.userId, p]));
    return users.map((u) => {
      const p = perfil.get(u.id);
      const name = p?.alias || u.displayName || 'Jugador';
      return {
        id: u.id,
        name,
        fullName: u.displayName || name,
        avatar: name.charAt(0).toUpperCase(), // inicial sobre el color de su mascota
        color: p?.mascotColor || COLOR_POR_DEFECTO,
        level: p?.level ?? 1,
      };
    });
  }
}

module.exports = { PrismaSocialRepository };
