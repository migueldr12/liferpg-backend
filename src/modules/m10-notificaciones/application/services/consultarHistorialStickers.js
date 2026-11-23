const { toStickerView } = require('../../infrastructure/mappers/m10Mappers');

// RDF109 · Stickers enviados y recibidos, con fecha y amigo, del más reciente al más antiguo.
function createConsultarHistorialStickers({ stickers }) {
  return async ({ userId, direction, friendId, onlyUnseen, page, limit }) => {
    // "No vistos" solo tiene sentido para los recibidos.
    const effectiveDirection = onlyUnseen ? 'recibidos' : direction;
    const { items, total } = await stickers.history({
      userId,
      direction: effectiveDirection,
      friendId,
      onlyUnseen,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: items.map((row) => toStickerView(row, userId)), total };
  };
}

module.exports = { createConsultarHistorialStickers };
