// Documento de BD → respuesta JSON de la API.

const toPersonView = (user) => ({
  id: user.id,
  displayName: user.displayName,
  alias: user.profile?.alias ?? null,
});

function toStickerView(row, viewerId) {
  return {
    id: row.id,
    direction: row.senderId === viewerId ? 'ENVIADO' : 'RECIBIDO',
    sender: toPersonView(row.sender),
    recipient: toPersonView(row.recipient),
    sticker: {
      id: row.catalogItem.id,
      name: row.catalogItem.name,
      icon: row.catalogItem.icon,
      category: row.catalogItem.category ? { id: row.catalogItem.category.id, name: row.catalogItem.category.name } : null,
    },
    message: row.message ?? null,
    sentAt: row.sentAt,
    seenAt: row.seenAt ?? null,
  };
}

// Agrupa los stickers por categoría, ordenados por nombre de categoría.
function toCatalogGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.category.id;
    if (!groups.has(key)) groups.set(key, { category: { id: key, name: item.category.name }, stickers: [] });
    groups.get(key).stickers.push({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      icon: item.icon,
      tags: item.tags ?? [],
    });
  }
  return [...groups.values()].sort((a, b) => a.category.name.localeCompare(b.category.name, 'es'));
}

const toAlertView = (row, viewerId) => ({
  id: row.id,
  kind: row.kind,
  message: row.message,
  thresholdDays: row.thresholdDays,
  createdAt: row.createdAt,
  resolvedAt: row.resolvedAt ?? null,
  isOwn: row.userId === viewerId,
  user: toPersonView(row.user),
});

module.exports = { toStickerView, toCatalogGroups, toAlertView, toPersonView };
