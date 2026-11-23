// Contratos de datos del M14: QUÉ operaciones existen, no CÓMO se hacen.
// Implementación real: infrastructure/repositories/Prisma*Repository.js (MongoDB).
// Las pruebas usan implementaciones en memoria (tests/support).

/* eslint-disable no-unused-vars */
const noImplementado = () => {
  throw new Error('No implementado');
};

// Economía versionada (RF043)
class EconomyRepository {
  async findLatest() { noImplementado(); } // → EconomyVersion | null
  async create(version) { noImplementado(); } // → EconomyVersion guardada (version única: si choca, error P2002)
}

// Catálogo (RF044)
class CatalogRepository {
  async listCategories() { noImplementado(); } // → CatalogCategory[] con inUse calculado
  async findCategoryById(id) { noImplementado(); }
  async findCategoryByName(name, type) { noImplementado(); } // sin distinguir mayúsculas
  async saveCategory(category) { noImplementado(); } // crea si id es null; actualiza si trae id
  async deleteCategory(id) { noImplementado(); }
  async listItems() { noImplementado(); } // artículos del catálogo (sin las recompensas personalizadas del M04)
  async findItemById(id) { noImplementado(); }
  async saveItem(item) { noImplementado(); }
}

// Avisos push (RF045)
class PushRepository {
  async countAudience() { noImplementado(); } // jugadores activos
  async findPlayerByUsername(username) { noImplementado(); } // → { userId, username } | null
  async findDeviceTokens(target) { noImplementado(); } // tokens FCM de los destinatarios
  async deactivateTokens(tokens) { noImplementado(); } // tokens que FCM ya no reconoce
  async findRecentDuplicate({ title, target, since }) { noImplementado(); } // → PushCampaign | null
  async saveCampaign(campaign, { sentById, targetUserId }) { noImplementado(); }
  async listCampaigns() { noImplementado(); } // más reciente primero
}

module.exports = { EconomyRepository, CatalogRepository, PushRepository };
