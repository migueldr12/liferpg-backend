const { conflict } = require('../../../../shared/errors/AppError');
const { giftBlockReason, isUnlimited } = require('../../domain/entities/Botin');
const { amigoDe, cofreDe, notificar } = require('./comunes');

// Valida (RDF089) y entrega (RDF090) un objeto del cofre de "fromId" a "to".
// Lo usan enviar un regalo y aceptar una solicitud.
async function entregar(deps, { fromId, to, itemId, message, requestId = null }) {
  const entry = await deps.botinRepository.findChestEntry(fromId, itemId);
  const blocked = giftBlockReason(entry);
  if (blocked) throw conflict(blocked);
  const transfer = await deps.botinRepository.createTransfer({
    senderId: fromId, recipientId: to.id, itemId, message, at: deps.now(), unlimited: isUnlimited(entry.item), requestId,
  });
  const [me] = await deps.botinRepository.findPeople([fromId]);
  const notification = await notificar(deps, to.id, {
    title: '¡Te llegó un regalo!',
    body: `${me?.name ?? 'Un amigo'} te envió ${entry.item.name}`,
  });
  return { transfer, item: entry.item, notification };
}

// RDF082 · enviarRegalo (con RDF089 y RDF090): el objeto pasa al inventario del amigo
const enviarRegalo = (deps) => async (userId, { friendId, itemId, message }) => {
  const friend = await amigoDe(deps, userId, friendId, 'Solo puedes enviar regalos a tus amigos.');
  const { item, notification } = await entregar(deps, { fromId: userId, to: friend, itemId, message });
  return { to: friend.name, item: item.name, chest: await cofreDe(deps, userId), notification };
};

module.exports = { enviarRegalo, entregar };
