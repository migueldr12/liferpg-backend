const { notFound, validationError } = require('../../../../shared/errors/AppError');

class UpdatePerfilService {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId, payload) {
    const userFields = {};
    const profileFields = {};

    if (payload.displayName !== undefined) {
      if (payload.displayName.trim().length < 2) {
        throw validationError({ displayName: 'El nombre debe tener al menos 2 caracteres.' });
      }
      userFields.displayName = payload.displayName.trim();
    }

    if (payload.email !== undefined) {
      if (!payload.email.includes('@')) {
        throw validationError({ email: 'Ingresa un correo electrónico válido.' });
      }
      userFields.email = payload.email.trim().toLowerCase();
    }

    if (payload.alias !== undefined) profileFields.alias = payload.alias.trim();
    if (payload.mascotName !== undefined) profileFields.mascotName = payload.mascotName.trim();
    if (payload.mascotColor !== undefined) profileFields.mascotColor = payload.mascotColor.trim();
    if (payload.avatarUrl !== undefined) profileFields.avatarUrl = payload.avatarUrl;
    if (payload.darkMode !== undefined) profileFields.darkMode = Boolean(payload.darkMode);

    const updated = await this.repository.updateProfile(userId, { userFields, profileFields });
    if (!updated) {
      throw notFound('No se encontró el perfil del usuario.');
    }

    return updated;
  }
}

module.exports = { UpdatePerfilService };