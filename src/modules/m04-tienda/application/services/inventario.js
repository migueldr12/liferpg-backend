const { badRequest, notFound } = require('../../../../shared/errors/AppError');
const {
  isClothingItem,
  isConsumableItem,
  toOwnedRewardDto,
  toConsumableDto,
  toClothingDto,
  toRedemptionDto,
} = require('../../infrastructure/mappers/tiendaMapper');

// Casos de uso del M04 · Inventario (RDF057 a RDF059).

const clothingFrom = async (repository, userId) =>
  (await repository.listInventory(userId))
    .filter(({ item }) => isClothingItem(item))
    .map(({ item, entry }) => toClothingDto(item, entry));

const consumablesFrom = async (repository, userId) =>
  (await repository.listInventory(userId))
    .filter(({ item }) => !isClothingItem(item) && isConsumableItem(item))
    .map(({ item, entry }) => toConsumableDto(item, entry));

// GET /inventario
function makeConsultarInventario({ repository }) {
  return async function consultarInventario(userId) {
    const rows = await repository.listInventory(userId);
    const inventory = { rewards: [], consumables: [], clothing: [] };

    for (const { item, entry } of rows) {
      if (isClothingItem(item)) inventory.clothing.push(toClothingDto(item, entry));
      else if (isConsumableItem(item)) inventory.consumables.push(toConsumableDto(item, entry));
      else inventory.rewards.push(toOwnedRewardDto(item, entry));
    }

    return inventory;
  };
}

// POST /inventario/recompensas/:id/canjear
function makeCanjearRecompensa({ repository }) {
  return async function canjearRecompensa(userId, id) {
    const row = await repository.findInventoryEntry(userId, id);
    if (!row) throw notFound('Esa recompensa ya no está en tu inventario.');
    if (isClothingItem(row.item)) {
      throw badRequest('La ropa y los fondos se equipan en el vestidor; no se canjean.');
    }
    if (isConsumableItem(row.item)) {
      throw badRequest('Ese artículo es un consumible: úsalo en lugar de canjearlo.');
    }
    await repository.redeemEntry(userId, row.entry, row.item);
  };
}

// POST /inventario/consumibles/:id/usar
function makeUsarConsumible({ repository }) {
  return async function usarConsumible(userId, id) {
    const row = await repository.findInventoryEntry(userId, id);
    if (!row) throw notFound('Ese consumible ya no está en tu inventario.');
    if (isClothingItem(row.item) || !isConsumableItem(row.item)) {
      throw badRequest('Ese artículo no es un consumible.');
    }
    await repository.consumeEntry(userId, row.entry, row.item);
    return consumablesFrom(repository, userId);
  };
}

// PATCH /inventario/ropa/:id — pone o quita la prenda; devuelve toda la ropa
function makeAlternarRopa({ repository }) {
  return async function alternarRopa(userId, id) {
    const row = await repository.findInventoryEntry(userId, id);
    if (!row) throw notFound('Esa prenda ya no está en tu inventario.');
    if (!isClothingItem(row.item)) {
      throw badRequest('Ese artículo no es ropa del tamagotchi.');
    }

    await repository.setClothingEquipped(userId, row.entry, row.item, !row.entry.equipped);
    return clothingFrom(repository, userId);
  };
}

// GET /inventario/canjes (RDF059)
function makeConsultarCanjes({ repository }) {
  return async function consultarCanjes(userId) {
    return (await repository.listRedemptions(userId)).map(({ movement, item }) =>
      toRedemptionDto(movement, item),
    );
  };
}

module.exports = {
  makeConsultarInventario,
  makeCanjearRecompensa,
  makeUsarConsumible,
  makeAlternarRopa,
  makeConsultarCanjes,
};
