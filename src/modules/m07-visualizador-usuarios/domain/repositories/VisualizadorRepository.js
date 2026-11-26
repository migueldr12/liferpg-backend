class VisualizadorRepository {
  async getAcceptedFriends(userId) {
    throw new Error('Método getAcceptedFriends no implementado');
  }

  async countAcceptedFriends(userId) {
    throw new Error('Método countAcceptedFriends no implementado');
  }

  async findAcceptedFriendshipBetween(userId, targetUserId) {
    throw new Error('Método findAcceptedFriendshipBetween no implementado');
  }

  async deleteFriendship(friendshipId) {
    throw new Error('Método deleteFriendship no implementado');
  }

  async getMirrorProfileData(targetUserId) {
    throw new Error('Método getMirrorProfileData no implementado');
  }

  async listCodesByUser(userId) {
    throw new Error('Método listCodesByUser no implementado');
  }

  async createFriendCode(data) {
    throw new Error('Método createFriendCode no implementado');
  }

  async findCodeById(codeId) {
    throw new Error('Método findCodeById no implementado');
  }

  async revokeCode(codeId) {
    throw new Error('Método revokeCode no implementado');
  }

  async findCodeByString(code) {
    throw new Error('Método findCodeByString no implementado');
  }

  async redeemCodeAndCreateFriendship({ codeRecord, redeemerId, pairKey }) {
    throw new Error('Método redeemCodeAndCreateFriendship no implementado');
  }
}

module.exports = { VisualizadorRepository };