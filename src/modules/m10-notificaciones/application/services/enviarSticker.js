const { AppError, notFound, validationError } = require('../../../../shared/errors/AppError');
const { toStickerView } = require('../../infrastructure/mappers/m10Mappers');

// RDF108 · Envía un sticker a uno o varios amigos y les avisa por push.
function createEnviarSticker({ stickers, friends, push, users }) {
  return async ({ senderId, senderName, recipientIds, catalogItemId, message }) => {
    if (recipientIds.includes(senderId)) {
      throw validationError({ recipientIds: 'No puedes enviarte un sticker a ti mismo.' });
    }

    const item = await stickers.findStickerItem(catalogItemId);
    if (!item) throw notFound('El sticker no existe o no está disponible.');

    const friendIds = new Set(await friends.listFriendIds(senderId));
    const strangers = recipientIds.filter((id) => !friendIds.has(id));
    if (strangers.length) {
      throw new AppError(403, 'FORBIDDEN', 'Solo puedes enviar stickers a tus amigos.', { recipientIds: strangers });
    }

    const sender = senderName ? null : await users.findAuthUser(senderId);
    const rows = await stickers.createMany({ senderId, recipientIds, catalogItemId, message });
    await push.notifyUsers(recipientIds, {
      title: `${senderName || sender?.displayName || 'Un amigo'} te envió “${item.name}”`,
      body: message || item.name,
      data: { type: 'STICKER', senderId, catalogItemId },
    });

    return rows.map((row) => toStickerView(row, senderId));
  };
}

module.exports = { createEnviarSticker };
