const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

const personSelect = { select: { id: true, displayName: true, profile: { select: { alias: true } } } };
const stickerInclude = {
  sender: personSelect,
  recipient: personSelect,
  catalogItem: { select: { id: true, name: true, icon: true, category: { select: { id: true, name: true } } } },
};
// Un sticker del catálogo es un CatalogItem activo cuya categoría es de tipo STICKER (M14 RDF140).
const stickerItemWhere = { active: true, category: { is: { type: 'STICKER', active: true } } };

// Filtro del historial. Si hay friendId, solo la conversación con ese amigo.
function buildHistoryWhere({ userId, direction, friendId, onlyUnseen }) {
  const sent = { senderId: userId, ...(friendId && { recipientId: friendId }) };
  const received = { recipientId: userId, ...(friendId && { senderId: friendId }), ...(onlyUnseen && { OR: [{ seenAt: null }, { seenAt: { isSet: false } }] }) };
  if (direction === 'enviados') return sent;
  if (direction === 'recibidos') return received;
  return { OR: [sent, received] };
}

function createStickerRepository(getDb = getPrisma) {
  return {
    listCatalog: ({ categoryId } = {}) =>
      getDb().catalogItem.findMany({
        where: { ...stickerItemWhere, ...(categoryId && { categoryId }) },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),

    findStickerItem: (id) =>
      getDb().catalogItem.findFirst({ where: { id, ...stickerItemWhere }, select: { id: true, name: true, icon: true } }),

    createMany({ senderId, recipientIds, catalogItemId, message }) {
      const db = getDb();
      return Promise.all(
        recipientIds.map((recipientId) =>
          db.stickerMessage.create({
            data: { senderId, recipientId, catalogItemId, message: message ?? null },
            include: stickerInclude,
          }),
        ),
      );
    },

    async history({ userId, direction, friendId, onlyUnseen, skip, take }) {
      const db = getDb();
      const where = buildHistoryWhere({ userId, direction, friendId, onlyUnseen });
      const [items, total] = await Promise.all([
        db.stickerMessage.findMany({ where, include: stickerInclude, orderBy: { sentAt: 'desc' }, skip, take }),
        db.stickerMessage.count({ where }),
      ]);
      return { items, total };
    },

    findById: (id) => getDb().stickerMessage.findUnique({ where: { id }, include: stickerInclude }),

    // Marca como vistos solo los stickers RECIBIDOS por el usuario que aún no lo estaban.
    async markSeen({ userId, ids }) {
      const result = await getDb().stickerMessage.updateMany({
        where: { recipientId: userId, OR: [{ seenAt: null }, { seenAt: { isSet: false } }], ...(ids && { id: { in: ids } }) },
        data: { seenAt: new Date() },
      });
      return result.count;
    },
  };
}

module.exports = { createStickerRepository, buildHistoryWhere };
