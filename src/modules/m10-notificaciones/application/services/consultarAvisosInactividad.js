const { toAlertView } = require('../../infrastructure/mappers/m10Mappers');

// RDF106 · Avisos propios y de amigos inactivos (solo amistades aceptadas).
function createConsultarAvisosInactividad({ alerts, friends }) {
  return async ({ userId, scope, includeResolved, page, limit }) => {
    const friendIds = scope === 'propios' ? [] : await friends.listFriendIds(userId);
    const userIds = scope === 'amigos' ? friendIds : scope === 'propios' ? [userId] : [userId, ...friendIds];
    if (!userIds.length) return { items: [], total: 0 };

    const { items, total } = await alerts.list({
      userIds,
      includeResolved,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: items.map((row) => toAlertView(row, userId)), total };
  };
}

module.exports = { createConsultarAvisosInactividad };
