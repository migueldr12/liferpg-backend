const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

function createFriendshipRepository(getDb = getPrisma) {
  return {
    // Ids de los amigos con amistad ACEPTADA (la amistad es simétrica: pudo iniciarla cualquiera).
    async listFriendIds(userId) {
      const rows = await getDb().friendship.findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { requesterId: true, addresseeId: true },
      });
      return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
    },
  };
}

module.exports = { createFriendshipRepository };
