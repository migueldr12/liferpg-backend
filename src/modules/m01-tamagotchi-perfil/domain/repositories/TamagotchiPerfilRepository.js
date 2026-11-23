class TamagotchiPerfilRepository {
  async getHudData(userId) {
    throw new Error('Método getHudData no implementado');
  }

  async getVestidorData(userId) {
    throw new Error('Método getVestidorData no implementado');
  }

  async saveAndEquipLook(userId, payload) {
    throw new Error('Método saveAndEquipLook no implementado');
  }

  async activateLook(userId, outfitId) {
    throw new Error('Método activateLook no implementado');
  }

  async updateProfile(userId, payload) {
    throw new Error('Método updateProfile no implementado');
  }
}

module.exports = { TamagotchiPerfilRepository };