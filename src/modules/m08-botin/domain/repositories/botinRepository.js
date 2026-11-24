// Contrato del repositorio del M08. Los servicios solo dependen de estas operaciones;
// la implementación con Prisma vive en infrastructure/repositories y las pruebas usan
// una en memoria. Entidades en el vocabulario de la PWA (ver domain/entities/Botin.js).
//
// Persona:    { id, name, fullName, avatar, pet, color, level }
// Entrada:    { itemId, qty, equipped, item: { id, name, icon, tags, group, giftable, active } }
// Solicitud:  { id, requesterId, ownerId, itemId, status: 'pendiente'|'aceptada'|'rechazada'|'cancelada',
//               message, createdAt, respondedAt }
// Envío:      { id, senderId, recipientId, itemId, message, sentAt, requestId }
//
// listFriendIds(userId)                 → ids de las amistades aceptadas (M07)
// findPeople(ids)                       → Persona[]
// listChest(userId)                     → Entrada[] con existencias (o ilimitadas), sin consumir
// findChestEntry(userId, itemId)        → Entrada | null
// findItems(ids)                        → Artículo[]
// createTransfer({ senderId, recipientId, itemId, message, at, unlimited, requestId })
//     → Envío. En UNA transacción: descuenta al que regala (si no es ilimitado), suma al que
//       recibe (origen GIFT), registra los dos movimientos y, si viene de una solicitud, la marca
//       aceptada. Lanza 409 si ya no hay existencias o la solicitud ya no está pendiente.
// listRequests(userId)                  → Solicitud[] que hizo o que recibió, recientes primero
// findRequest(requestId)                → Solicitud | null
// hasPendingRequest({ requesterId, ownerId, itemId }) → boolean
// createRequest({ requesterId, ownerId, itemId, message, at }) → Solicitud
// rejectRequest(requestId, at)          → Solicitud | null  (null si ya no estaba pendiente)
// listTransfers(userId, { since })      → Envío[] que hizo o que recibió, recientes primero
// deviceTokens(userId)                  → tokens de FCM activos
// deactivateTokens(tokens)              → void

const REQUIRED = [
  'listFriendIds', 'findPeople', 'listChest', 'findChestEntry', 'findItems', 'createTransfer',
  'listRequests', 'findRequest', 'hasPendingRequest', 'createRequest', 'rejectRequest',
  'listTransfers', 'deviceTokens', 'deactivateTokens',
];

// Falla al arrancar si una implementación olvida una operación
function assertBotinRepository(repo) {
  const missing = REQUIRED.filter((name) => typeof repo?.[name] !== 'function');
  if (missing.length) throw new Error(`El repositorio del M08 no implementa: ${missing.join(', ')}`);
  return repo;
}

module.exports = { assertBotinRepository };
