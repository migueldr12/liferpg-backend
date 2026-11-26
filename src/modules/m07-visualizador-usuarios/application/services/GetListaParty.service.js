const { notFound } = require('../../../../shared/errors/AppError');
const { MAX_PARTY_SIZE } = require('../../domain/entities/Vinculacion.entity');

class GetListaPartyService {
  constructor(visualizadorRepository) {
    this.visualizadorRepository = visualizadorRepository;
  }

  async execute(userId, { q = '', sort = 'nivel' } = {}) {
    const allFriends = await this.visualizadorRepository.getAcceptedFriends(userId);
    const total = allFriends.length;

    const term = String(q).trim().toLowerCase();
    let filtered = allFriends;

    if (term) {
      filtered = allFriends.filter(
        (f) =>
          f.nombre.toLowerCase().includes(term) ||
          f.alias.toLowerCase().includes(term)
      );
    }

    const sortKey = String(sort).toLowerCase();
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'racha') {
        return b.racha - a.racha || b.nivel - a.nivel;
      }
      if (sortKey === 'actividad') {
        return new Date(b.ultimaActividadAt).getTime() - new Date(a.ultimaActividadAt).getTime();
      }
      return b.nivel - a.nivel || b.racha - a.racha;
    });

    return {
      total,
      limite: MAX_PARTY_SIZE,
      amigos: sorted,
    };
  }

  async removeFriend(userId, friendId) {
    const friendship = await this.visualizadorRepository.findAcceptedFriendshipBetween(
      userId,
      friendId
    );

    if (!friendship) {
      throw notFound('No existe una vinculación activa con este usuario.');
    }

    await this.visualizadorRepository.deleteFriendship(friendship.id);
    return { removed: true, friendId };
  }
}

module.exports = { GetListaPartyService };