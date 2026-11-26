const { forbidden, notFound } = require('../../../../shared/errors/AppError');
const { VisualizadorMapper } = require('../../infrastructure/mappers/Visualizador.mapper');

class GetPerfilEspejoService {
  constructor(visualizadorRepository) {
    this.visualizadorRepository = visualizadorRepository;
  }

  async execute(viewerId, friendId) {
    if (String(viewerId) !== String(friendId)) {
      const friendship = await this.visualizadorRepository.findAcceptedFriendshipBetween(
        viewerId,
        friendId
      );
      if (!friendship) {
        throw forbidden('Solo puedes ver el perfil espejo de amigos vinculados a tu party.');
      }

      const targetUser = await this.visualizadorRepository.getMirrorProfileData(friendId);
      if (!targetUser || !targetUser.profile) {
        throw notFound('No se encontró el perfil del jugador.');
      }

      return VisualizadorMapper.toMirrorProfile(targetUser, friendship);
    }

    const selfUser = await this.visualizadorRepository.getMirrorProfileData(friendId);
    if (!selfUser || !selfUser.profile) {
      throw notFound('No se encontró el perfil del jugador.');
    }

    return VisualizadorMapper.toMirrorProfile(selfUser, null);
  }
}

module.exports = { GetPerfilEspejoService };