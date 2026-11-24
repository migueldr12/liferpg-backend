const { conflict, notFound } = require('../../../../shared/errors/AppError');
const { friendChestView, giftBlockReason, newestFirst, sortByName } = require('../../domain/entities/Botin');
const { amigoDe, cofreDe, notificar, vistas } = require('./comunes');
const { entregar } = require('./enviarRegalo');

const ALREADY_ANSWERED = 'La solicitud ya fue respondida.';

// Solicitud como la ve quien la recibe (bandeja) o quien la hizo (mías)
const inboxView = (v) => (r) => ({ id: r.id, from: r.requesterId, itemId: r.itemId, reason: r.message ?? '', at: r.createdAt, status: r.status, person: v.person(r.requesterId), item: v.item(r.itemId) });
const mineView = (v) => (r) => ({ id: r.id, to: r.ownerId, itemId: r.itemId, at: r.createdAt, status: r.status, person: v.person(r.ownerId), item: v.item(r.itemId) });

// RDF084 · consultarSolicitudesRegalo: las que me hicieron, las que hice y mi cofre para responder
const consultarSolicitudes = (deps) => async (userId) => {
  const requests = (await deps.botinRepository.listRequests(userId)).sort(newestFirst('createdAt'));
  const v = await vistas(deps, requests.flatMap((r) => [r.requesterId, r.ownerId]), requests.map((r) => r.itemId));
  return {
    inbox: requests.filter((r) => r.ownerId === userId).map(inboxView(v)),
    mine: requests.filter((r) => r.requesterId === userId).map(mineView(v)),
    chest: await cofreDe(deps, userId),
  };
};

// RDF085 · responderSolicitudRegalo: aceptar entrega el objeto (RDF082 con RDF089); rechazar solo la cierra
const responderSolicitud = (deps) => async (userId, requestId, accept) => {
  const request = await deps.botinRepository.findRequest(requestId);
  if (!request || request.ownerId !== userId) throw notFound('No encontramos esa solicitud.');
  if (request.status !== 'pendiente') throw conflict(ALREADY_ANSWERED);

  let updated;
  if (accept) {
    const requester = await amigoDe(deps, userId, request.requesterId, 'Ya no son amigos: no puedes enviarle regalos.');
    await entregar(deps, { fromId: userId, to: requester, itemId: request.itemId, message: null, requestId: request.id });
    updated = { ...request, status: 'aceptada', respondedAt: deps.now() };
  } else {
    updated = await deps.botinRepository.rejectRequest(request.id, deps.now());
    if (!updated) throw conflict(ALREADY_ANSWERED);
  }
  const v = await vistas(deps, [request.requesterId], [request.itemId]);
  return { request: inboxView(v)(updated), chest: await cofreDe(deps, userId) };
};

// Parte de RDF083: los objetos regalables del cofre de un amigo, para elegir qué pedirle
const consultarCofreAmigo = (deps) => async (userId, friendId) => {
  await amigoDe(deps, userId, friendId, 'Solo puedes ver el cofre de tus amigos.');
  const entries = await deps.botinRepository.listChest(friendId);
  return sortByName(entries.filter((e) => !giftBlockReason(e)).map(friendChestView));
};

// RDF083 · solicitarRegalo: pide un objeto regalable del cofre de un amigo
const solicitarRegalo = (deps) => async (userId, { friendId, itemId, reason }) => {
  const friend = await amigoDe(deps, userId, friendId, 'Solo puedes pedir regalos a tus amigos.');
  const entry = await deps.botinRepository.findChestEntry(friendId, itemId);
  if (giftBlockReason(entry)) throw conflict('Ese objeto ya no está en el cofre de tu amigo.');
  if (await deps.botinRepository.hasPendingRequest({ requesterId: userId, ownerId: friendId, itemId })) {
    throw conflict('Ya le pediste ese objeto; espera su respuesta.');
  }
  const request = await deps.botinRepository.createRequest({ requesterId: userId, ownerId: friendId, itemId, message: reason, at: deps.now() });
  const [me] = await deps.botinRepository.findPeople([userId]);
  await notificar(deps, friend.id, { title: 'Te pidieron un regalo', body: `${me?.name ?? 'Un amigo'} te pidió ${entry.item.name}` });
  const v = await vistas(deps, [friendId], [itemId]);
  return mineView(v)(request);
};

module.exports = { consultarSolicitudes, responderSolicitud, consultarCofreAmigo, solicitarRegalo };
