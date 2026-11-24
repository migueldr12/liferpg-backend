// Traduce los documentos de MongoDB (enums en inglés) a las entidades del M08.

const REQUEST_STATUS = { PENDING: 'pendiente', ACCEPTED: 'aceptada', REJECTED: 'rechazada', CANCELLED: 'cancelada' };
const SPECIES = { CAT: 'gato', DOG: 'perro', DRAGON: 'dragon', HAMSTER: 'hamster', LION: 'leon' };
// Colores de la mascota (los mismos que la app móvil); también acepta un color CSS ya guardado
const COLORS = { verde: '#4caf50', morado: '#9c27b0', rojo: '#e5533d', azul: '#2f80ed', naranja: '#f2994a' };
const DEFAULT_COLOR = COLORS.morado;

const colorOf = (value) => COLORS[String(value ?? '').toLowerCase()] ?? (/^#[0-9a-f]{3,8}$/i.test(value ?? '') ? value : DEFAULT_COLOR);

function toPerson(user, profile) {
  const name = profile?.alias || user.displayName || 'Jugador';
  return {
    id: user.id,
    name,
    fullName: user.displayName || name,
    avatar: name.charAt(0).toUpperCase(), // inicial sobre el color de su mascota (igual que el M12)
    pet: SPECIES[profile?.species] ?? profile?.species?.toLowerCase() ?? null,
    color: colorOf(profile?.mascotColor),
    level: profile?.level ?? 1,
  };
}

const toItem = (doc) =>
  doc && { id: doc.id, name: doc.name, icon: doc.icon, tags: doc.tags ?? [], group: doc.group, giftable: Boolean(doc.giftable), active: doc.active !== false };

const toEntry = (doc, item) => ({ itemId: doc.catalogItemId, qty: doc.quantity, equipped: Boolean(doc.equipped), item });

const toRequest = (doc) =>
  doc && {
    id: doc.id,
    requesterId: doc.requesterId,
    ownerId: doc.ownerId,
    itemId: doc.catalogItemId,
    status: REQUEST_STATUS[doc.status] ?? 'pendiente',
    message: doc.message ?? null,
    createdAt: doc.createdAt,
    respondedAt: doc.respondedAt ?? null,
  };

const toTransfer = (doc) =>
  doc && {
    id: doc.id,
    senderId: doc.senderId,
    recipientId: doc.recipientId,
    itemId: doc.catalogItemId,
    message: doc.message ?? null,
    sentAt: doc.sentAt,
    requestId: doc.giftRequestId ?? null,
  };

module.exports = { toPerson, toItem, toEntry, toRequest, toTransfer, colorOf };
