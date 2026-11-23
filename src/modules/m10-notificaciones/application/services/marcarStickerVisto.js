const { notFound } = require('../../../../shared/errors/AppError');
const { toStickerView } = require('../../infrastructure/mappers/m10Mappers');

// RDF110 · Marca stickers recibidos como vistos. Es idempotente.
//  - con `id`: marca uno y devuelve el sticker actualizado
//  - con `ids` (o sin nada): marca varios (o todos los pendientes) y devuelve { updated }
function createMarcarStickerVisto({ stickers }) {
  return async ({ userId, id, ids }) => {
    if (id) {
      const row = await stickers.findById(id);
      // Solo el destinatario puede marcarlo; para los demás "no existe".
      if (!row || row.recipientId !== userId) throw notFound('No se encontró el sticker.');
      if (!row.seenAt) await stickers.markSeen({ userId, ids: [id] });
      return toStickerView(await stickers.findById(id), userId);
    }
    return { updated: await stickers.markSeen({ userId, ids }) };
  };
}

module.exports = { createMarcarStickerVisto };
