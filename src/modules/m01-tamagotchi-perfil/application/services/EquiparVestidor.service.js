const { notFound, validationError } = require('../../../../shared/errors/AppError');

class EquiparVestidorService {
  constructor(repository) {
    this.repository = repository;
  }

  async getVestidor(userId) {
    const data = await this.repository.getVestidorData(userId);
    if (!data) {
      throw notFound('No se encontró el perfil del jugador.');
    }

    const { profile, inventory, outfits } = data;
    const activeOutfit = outfits.find((o) => o.isActive) || null;
    const equippedMap = activeOutfit?.equipped || {};

    const items = inventory
      .filter((entry) => entry.catalogItem && entry.catalogItem.slot)
      .map((entry) => {
        const item = entry.catalogItem;
        const slotKey = item.slot.toLowerCase();
        const isEquipped = equippedMap[slotKey] === item.id;

        return {
          inventoryEntryId: entry.id,
          catalogItemId: item.id,
          name: item.name,
          description: item.description,
          icon: item.icon,
          slot: item.slot, // HEAD | FACE | BODY | BACKGROUND
          pointType: item.pointType, // CULTURE | PHYSICAL | FOCUS
          equipped: isEquipped,
          statusLabel: isEquipped ? 'Equipado' : 'Tuyo',
        };
      });

    return {
      points: {
        culturePoints: profile.culturePoints,
        physicalPoints: profile.physicalPoints,
        focusPoints: profile.focusPoints,
      },
      activeOutfit,
      savedOutfits: outfits,
      items,
    };
  }

  async saveLook(userId, { outfitId, name, equipped }) {
    if (!name || name.trim().length === 0 || name.trim().length > 24) {
      throw validationError({ name: 'El nombre del look debe tener entre 1 y 24 caracteres.' });
    }

    const data = await this.repository.getVestidorData(userId);
    if (!data) {
      throw notFound('No se encontró el perfil del jugador.');
    }

    // Validar que los ítems enviados pertenezcan al inventario del usuario
    const ownedIds = new Set(data.inventory.map((e) => e.catalogItemId));
    const slots = ['head', 'face', 'body', 'background'];
    const cleanEquipped = {};

    for (const slot of slots) {
      const itemId = equipped?.[slot] || null;
      if (itemId && !ownedIds.has(itemId)) {
        throw validationError({ [slot]: 'Uno de los accesorios seleccionados no pertenece a tu inventario.' });
      }
      cleanEquipped[slot] = itemId;
    }

    return this.repository.saveAndEquipLook(userId, {
      outfitId,
      name: name.trim(),
      equipped: cleanEquipped,
    });
  }

  async activateLook(userId, outfitId) {
    const data = await this.repository.getVestidorData(userId);
    if (!data) throw notFound('No se encontró el perfil del jugador.');

    const exists = data.outfits.some((o) => o.id === outfitId);
    if (!exists) throw notFound('El look guardado no existe.');

    return this.repository.activateLook(userId, outfitId);
  }
}

module.exports = { EquiparVestidorService };