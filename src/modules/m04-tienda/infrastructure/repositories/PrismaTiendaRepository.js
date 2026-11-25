const { badRequest, notFound } = require('../../../../shared/errors/AppError');
const { POINT_TO_DB, SLOT_FROM_DB, assetOf } = require('../mappers/tiendaMapper');

// Acceso a MongoDB para el M04 (tienda e inventario). Los servicios no conocen
// Prisma: piden estas operaciones y las pruebas pueden sustituirlas.
//
// El catálogo vive en catalog_items (compartido con el M14):
// - group = "tienda" → artículos de la tienda para todos (el catálogo también
//                      guarda stickers, exclusivos, regalables… que aquí no salen).
// - custom = true   → recompensa personalizada de un jugador (ownerId).
// - slot != null    → ropa o fondo (Cabeza, Cara, Cuerpo, Fondo).
// - consumable      → recompensa que desaparece al canjearla.

const OBJECT_ID = /^[a-f\d]{24}$/i;

const POINT_FIELD = {
  CULTURE: 'culturePoints',
  PHYSICAL: 'physicalPoints',
  FOCUS: 'focusPoints',
};

const SLOT_PROFILE_FIELD = {
  HEAD: 'equippedHeadSlug',
  FACE: 'equippedFaceSlug',
  BODY: 'equippedBodySlug',
  BACKGROUND: 'equippedBgSlug',
};

const isObjectId = (id) => OBJECT_ID.test(id ?? '');

// En MongoDB, `consumedAt: null` no encuentra los documentos donde el campo ni
// siquiera existe (así los crea Prisma). Por eso se filtra aquí y no en la consulta.
const notConsumed = (entry) => !entry.consumedAt;

const SHOP_GROUP = 'tienda';

const visibleToUser = (userId) => ({
  OR: [
    { group: SHOP_GROUP, custom: { not: true } },
    { ownerId: userId, custom: true },
  ],
});

class PrismaTiendaRepository {
  /** @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient) }} options */
  constructor({ db }) {
    this.cliente = typeof db === 'function' ? db : () => db;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  // ───────── Catálogo de la tienda ─────────

  async listShopItems(userId) {
    return this.db.catalogItem.findMany({
      where: { active: { not: false }, ...visibleToUser(userId) },
      orderBy: [{ custom: 'asc' }, { name: 'asc' }],
    });
  }

  async findShopItem(userId, id) {
    if (!isObjectId(id)) return null;
    return this.db.catalogItem.findFirst({
      where: { id, active: { not: false }, ...visibleToUser(userId) },
    });
  }

  async findItemById(id) {
    if (!isObjectId(id)) return null;
    return this.db.catalogItem.findUnique({ where: { id } });
  }

  // ───────── Compra ─────────

  async getProfile(userId) {
    return this.db.playerProfile.findUnique({ where: { userId } });
  }

  // Descuenta los puntos y agrega el artículo al inventario en una sola transacción.
  async purchase(userId, item) {
    const pointField = POINT_FIELD[item.pointType];
    if (!pointField) throw badRequest('El artículo no tiene un tipo de puntos configurado.');

    return this.db.$transaction(async (tx) => {
      const profile = await tx.playerProfile.findUnique({ where: { userId } });
      if (!profile) throw notFound('Completa tu cuenta para comprar en la tienda.');

      const current = profile[pointField] ?? 0;
      if (current < item.price) throw badRequest('No tienes puntos suficientes.');

      const existing = await tx.inventoryEntry.findFirst({
        where: { userId, catalogItemId: item.id },
      });
      if (existing && item.slot) throw badRequest('Ya tienes esta prenda.');

      const updated = await tx.playerProfile.update({
        where: { userId },
        data: { [pointField]: { decrement: item.price } },
      });

      const entry = existing
        ? await tx.inventoryEntry.update({
            where: { id: existing.id },
            data: { quantity: { increment: 1 }, consumedAt: null, source: 'PURCHASE' },
          })
        : await tx.inventoryEntry.create({
            data: { userId, catalogItemId: item.id, quantity: 1, source: 'PURCHASE' },
          });

      await tx.inventoryMovement.create({
        data: {
          userId,
          catalogItemId: item.id,
          inventoryEntryId: entry.id,
          type: 'PURCHASE',
          quantity: 1,
        },
      });

      return { profile: updated, entry };
    });
  }

  // ───────── Inventario ─────────

  // Devuelve cada existencia con su artículo del catálogo (sin include para que
  // funcione igual con el cliente falso de las pruebas).
  async listInventory(userId) {
    const entries = await this.db.inventoryEntry.findMany({
      where: { userId },
      orderBy: { acquiredAt: 'desc' },
    });
    return this.joinItems(entries.filter(notConsumed));
  }

  async findInventoryEntry(userId, itemId) {
    if (!isObjectId(itemId)) return null;
    // Hay una sola existencia por jugador y artículo (@@unique userId + catalogItemId).
    const entry = await this.db.inventoryEntry.findFirst({
      where: { userId, catalogItemId: itemId },
    });
    if (!entry || !notConsumed(entry)) return null;
    const item = await this.db.catalogItem.findUnique({ where: { id: itemId } });
    return item ? { entry, item } : null;
  }

  async redeemEntry(userId, entry, item) {
    return this.db.$transaction(async (tx) => {
      await tx.inventoryEntry.update({
        where: { id: entry.id },
        data: { quantity: 0, consumedAt: new Date() },
      });
      await tx.inventoryMovement.create({
        data: {
          userId,
          catalogItemId: item.id,
          inventoryEntryId: entry.id,
          type: 'REDEEM',
          quantity: 1,
        },
      });
    });
  }

  async consumeEntry(userId, entry, item) {
    return this.db.$transaction(async (tx) => {
      const last = (entry.quantity ?? 1) <= 1;
      await tx.inventoryEntry.update({
        where: { id: entry.id },
        data: last
          ? { quantity: 0, consumedAt: new Date() }
          : { quantity: { decrement: 1 } },
      });
      await tx.inventoryMovement.create({
        data: {
          userId,
          catalogItemId: item.id,
          inventoryEntryId: entry.id,
          type: 'REDEEM',
          quantity: 1,
        },
      });
    });
  }

  // RDF021/RDF022: una sola prenda por parte. También actualiza el perfil para que
  // la Casa y el Vestidor (M01) vean el mismo look.
  async setClothingEquipped(userId, entry, item, equipped) {
    const slot = item.slot;
    return this.db.$transaction(async (tx) => {
      if (equipped) {
        const entries = (await tx.inventoryEntry.findMany({ where: { userId } })).filter(notConsumed);
        const ids = [...new Set(entries.map((e) => e.catalogItemId))];
        const items = ids.length
          ? await tx.catalogItem.findMany({ where: { id: { in: ids }, slot } })
          : [];
        const sameSlot = new Set(items.map((i) => i.id));
        for (const other of entries) {
          if (sameSlot.has(other.catalogItemId) && other.equipped) {
            await tx.inventoryEntry.update({ where: { id: other.id }, data: { equipped: false } });
          }
        }
      }

      const updated = await tx.inventoryEntry.update({
        where: { id: entry.id },
        data: { equipped },
      });

      const profileField = SLOT_PROFILE_FIELD[slot];
      if (profileField) {
        await tx.playerProfile
          .update({
            where: { userId },
            // Se guarda el nombre de la imagen (el mismo `asset` que recibe la app)
            // para que la Casa dibuje la prenda; si no hay, el id.
            data: { [profileField]: equipped ? assetOf(item) ?? item.id : null },
          })
          .catch(() => null);
      }

      return updated;
    });
  }

  async listRedemptions(userId) {
    const movements = await this.db.inventoryMovement.findMany({
      where: { userId, type: 'REDEEM' },
      orderBy: { createdAt: 'desc' },
    });
    return this.joinItems(movements, 'movement');
  }

  // ───────── Recompensas personalizadas ─────────

  async findCustomReward(userId, id) {
    if (!isObjectId(id)) return null;
    return this.db.catalogItem.findFirst({
      where: { id, ownerId: userId, custom: true },
    });
  }

  async createCustomReward(userId, data) {
    return this.db.catalogItem.create({
      data: {
        ownerId: userId,
        custom: true,
        active: true,
        group: 'tienda',
        giftable: false,
        tags: [],
        ...data,
      },
    });
  }

  async updateCustomReward(id, data) {
    return this.db.catalogItem.update({ where: { id }, data });
  }

  async deleteCustomReward(id) {
    await this.db.catalogItem.delete({ where: { id } });
  }

  // ───────── Utilidades ─────────

  async joinItems(rows, key = 'entry') {
    const ids = [...new Set(rows.map((r) => r.catalogItemId))];
    if (!ids.length) return [];
    const items = await this.db.catalogItem.findMany({ where: { id: { in: ids } } });
    const byId = new Map(items.map((item) => [item.id, item]));
    return rows
      .map((row) => ({ [key]: row, item: byId.get(row.catalogItemId) }))
      .filter((row) => row.item);
  }
}

module.exports = {
  PrismaTiendaRepository,
  POINT_TO_DB,
  SLOT_FROM_DB,
};
