const { forbidden } = require('../../../../shared/errors/AppError');
const { chestView, itemView, personView, sortByName } = require('../../domain/entities/Botin');

// Piezas que comparten los servicios del M08.

// El amigo con su perfil público, o 403 si no hay una amistad aceptada (M07)
async function amigoDe({ botinRepository }, userId, friendId, message = 'Solo puedes intercambiar regalos con tus amigos.') {
  if (friendId === userId) throw forbidden(message);
  const ids = await botinRepository.listFriendIds(userId);
  if (!ids.includes(friendId)) throw forbidden(message);
  const [friend] = await botinRepository.findPeople([friendId]);
  if (!friend) throw forbidden(message);
  return friend;
}

// El cofre del usuario, ordenado por nombre (RDF088)
async function cofreDe({ botinRepository }, userId) {
  return sortByName((await botinRepository.listChest(userId)).map(chestView));
}

// Personas y artículos de una lista de solicitudes o envíos, en una sola lectura cada uno
async function vistas({ botinRepository }, personIds, itemIds) {
  const [people, items] = await Promise.all([botinRepository.findPeople(personIds), botinRepository.findItems(itemIds)]);
  const person = new Map(people.map((p) => [p.id, personView(p)]));
  const item = new Map(items.map((i) => [i.id, itemView(i)]));
  return { person: (id) => person.get(id) ?? { id, name: 'Jugador', avatar: 'J', pet: null, color: '#9c27b0' }, item: (id) => item.get(id) ?? null };
}

// RDF090 · aviso push al amigo. Nunca hace fallar el regalo: devuelve cómo le fue.
async function notificar({ botinRepository, pushSender }, userId, message) {
  if (!pushSender?.isConfigured?.()) return 'sin_configurar';
  try {
    const tokens = await botinRepository.deviceTokens(userId);
    if (!tokens.length) return 'sin_dispositivo';
    const result = await pushSender.send(tokens, message);
    if (result.invalidTokens?.length) await botinRepository.deactivateTokens(result.invalidTokens);
    return result.sent > 0 ? 'enviada' : 'fallo';
  } catch {
    return 'fallo';
  }
}

module.exports = { amigoDe, cofreDe, vistas, notificar };
