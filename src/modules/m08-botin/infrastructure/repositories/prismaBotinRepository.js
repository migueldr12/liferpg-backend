const { conflict } = require('../../../../shared/errors/AppError');
const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { assertBotinRepository } = require('../../domain/repositories/botinRepository');
const { toEntry, toItem, toPerson, toRequest, toTransfer } = require('../mappers/botinMapper');

// Repositorio del M08 sobre MongoDB (Prisma). Lee amistades (M07), perfiles y catálogo (M14);
// escribe inventario, movimientos, solicitudes (gift_requests) y envíos (gift_transfers).
// Las relaciones se leen con consultas aparte (sin include) y los campos opcionales se
// revisan en código: en MongoDB "campo: null" no encuentra documentos sin ese campo.

const HISTORY_LIMIT = 200;
const REQUESTS_LIMIT = 100;
const OUT_OF_STOCK = 'Ya no te quedan existencias de ese objeto.';

function createPrismaBotinRepository({ db = getPrisma } = {}) {
  const prisma = () => (typeof db === 'function' ? db() : db);

  async function itemsById(client, ids) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const docs = await client.catalogItem.findMany({ where: { id: { in: unique } } });
    return new Map(docs.map((d) => [d.id, toItem(d)]));
  }

  async function entriesOf(client, where) {
    const docs = (await client.inventoryEntry.findMany({ where })).filter((d) => !d.consumedAt);
    const items = await itemsById(client, docs.map((d) => d.catalogItemId));
    return docs.map((d) => toEntry(d, items.get(d.catalogItemId) ?? null)).filter((e) => e.item);
  }

  return assertBotinRepository({
    async listFriendIds(userId) {
      const rows = await prisma().friendship.findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      });
      return [...new Set(rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)))];
    },

    async findPeople(ids) {
      const unique = [...new Set(ids)];
      if (!unique.length) return [];
      const [users, profiles] = await Promise.all([
        prisma().user.findMany({ where: { id: { in: unique } } }),
        prisma().playerProfile.findMany({ where: { userId: { in: unique } } }),
      ]);
      const byUser = new Map(profiles.map((p) => [p.userId, p]));
      return users.map((u) => toPerson(u, byUser.get(u.id)));
    },

    async listChest(userId) {
      const entries = await entriesOf(prisma(), { userId });
      return entries.filter((e) => e.qty > 0 || (e.item.tags ?? []).includes('carta'));
    },

    async findChestEntry(userId, itemId) {
      const [entry] = await entriesOf(prisma(), { userId, catalogItemId: itemId });
      return entry ?? null;
    },

    async findItems(ids) {
      return [...(await itemsById(prisma(), ids)).values()];
    },

    async createTransfer({ senderId, recipientId, itemId, message, at, unlimited, requestId = null }) {
      return prisma().$transaction(async (tx) => {
        const from = await tx.inventoryEntry.findUnique({ where: { userId_catalogItemId: { userId: senderId, catalogItemId: itemId } } });
        if (!from) throw conflict(OUT_OF_STOCK);
        if (!unlimited) {
          // Descuenta solo si aún hay existencias (evita regalar dos veces la última)
          const taken = await tx.inventoryEntry.updateMany({ where: { id: from.id, quantity: { gte: 1 } }, data: { quantity: { increment: -1 } } });
          if (taken.count === 0) throw conflict(OUT_OF_STOCK);
        }
        if (requestId) {
          const accepted = await tx.giftRequest.updateMany({ where: { id: requestId, status: 'PENDING' }, data: { status: 'ACCEPTED', respondedAt: at } });
          if (accepted.count === 0) throw conflict('La solicitud ya fue respondida.');
        }
        const to = await tx.inventoryEntry.upsert({
          where: { userId_catalogItemId: { userId: recipientId, catalogItemId: itemId } },
          create: { userId: recipientId, catalogItemId: itemId, quantity: 1, source: 'GIFT', acquiredAt: at },
          update: { quantity: { increment: 1 } },
        });
        const transfer = await tx.giftTransfer.create({
          data: { senderId, recipientId, catalogItemId: itemId, ...(requestId && { giftRequestId: requestId }), status: 'DELIVERED', message, sentAt: at, deliveredAt: at },
        });
        const ref = { referenceType: 'gift_transfer', referenceId: transfer.id };
        await tx.inventoryMovement.create({ data: { userId: senderId, catalogItemId: itemId, inventoryEntryId: from.id, type: 'GIFT_OUT', quantity: unlimited ? 0 : 1, createdAt: at, ...ref } });
        await tx.inventoryMovement.create({ data: { userId: recipientId, catalogItemId: itemId, inventoryEntryId: to.id, type: 'GIFT_IN', quantity: 1, createdAt: at, ...ref } });
        return toTransfer(transfer);
      });
    },

    async listRequests(userId) {
      const docs = await prisma().giftRequest.findMany({
        where: { OR: [{ requesterId: userId }, { ownerId: userId }] },
        orderBy: { createdAt: 'desc' },
        take: REQUESTS_LIMIT,
      });
      return docs.map(toRequest);
    },

    async findRequest(requestId) {
      return toRequest(await prisma().giftRequest.findUnique({ where: { id: requestId } }));
    },

    async hasPendingRequest({ requesterId, ownerId, itemId }) {
      const n = await prisma().giftRequest.count({ where: { requesterId, ownerId, catalogItemId: itemId, status: 'PENDING' } });
      return n > 0;
    },

    async createRequest({ requesterId, ownerId, itemId, message, at }) {
      const doc = await prisma().giftRequest.create({ data: { requesterId, ownerId, catalogItemId: itemId, message, status: 'PENDING', createdAt: at } });
      return toRequest(doc);
    },

    async rejectRequest(requestId, at) {
      const res = await prisma().giftRequest.updateMany({ where: { id: requestId, status: 'PENDING' }, data: { status: 'REJECTED', respondedAt: at } });
      return res.count ? toRequest(await prisma().giftRequest.findUnique({ where: { id: requestId } })) : null;
    },

    async listTransfers(userId, { since } = {}) {
      const docs = await prisma().giftTransfer.findMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }], ...(since && { sentAt: { gte: since } }) },
        orderBy: { sentAt: 'desc' },
        take: HISTORY_LIMIT,
      });
      return docs.map(toTransfer);
    },

    async deviceTokens(userId) {
      const rows = await prisma().device.findMany({ where: { userId, active: true } });
      return rows.map((r) => r.fcmToken);
    },

    async deactivateTokens(tokens) {
      if (tokens.length) await prisma().device.updateMany({ where: { fcmToken: { in: tokens } }, data: { active: false } });
    },
  });
}

module.exports = { createPrismaBotinRepository };
