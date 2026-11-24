const { newestFirst } = require('../../domain/entities/Botin');
const { vistas } = require('./comunes');

// RDF086 · consultarHistorialBotin + RDF087 · filtrarHistorialBotin
// Lo que regalé y lo que me regalaron, del más reciente al más antiguo.
const consultarHistorial = (deps) => async (userId, { direction, friendId, since }) => {
  const rows = (await deps.botinRepository.listTransfers(userId, { since }))
    .map((t) => {
      const sent = t.senderId === userId;
      return { id: t.id, direction: sent ? 'enviado' : 'recibido', friendId: sent ? t.recipientId : t.senderId, itemId: t.itemId, message: t.message ?? '', at: t.sentAt };
    })
    .filter((h) => (!direction || h.direction === direction) && (!friendId || h.friendId === friendId) && (!since || new Date(h.at) >= since))
    .sort(newestFirst('at'));
  const v = await vistas(deps, rows.map((h) => h.friendId), rows.map((h) => h.itemId));
  return rows.map((h) => ({ ...h, person: v.person(h.friendId), item: v.item(h.itemId) }));
};

module.exports = { consultarHistorial };
