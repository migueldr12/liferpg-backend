const { validationError, notFound } = require('../../../../shared/errors/AppError');

const SECTIONS = ['profile', 'habits', 'missions', 'inventory'];
const OBJECT_ID = /^[a-f0-9]{24}$/i;

function createProfileExportService(repository, now = () => new Date()) {
  return {
    listProfiles: () => repository.listProfiles(),
    async exportProfiles({ userIds, sections } = {}) {
      if (!Array.isArray(userIds) || !userIds.length || userIds.length > 20 || userIds.some((id) => typeof id !== 'string' || !OBJECT_ID.test(id))) {
        throw validationError({ userIds: 'Selecciona entre 1 y 20 usuarios válidos.' });
      }
      if (!Array.isArray(sections) || !sections.length || sections.some((section) => !SECTIONS.includes(section))) {
        throw validationError({ sections: 'Selecciona al menos una sección válida.' });
      }
      const ids = [...new Set(userIds)];
      const data = await repository.exportProfiles(ids, [...new Set(sections)]);
      if (data.users.length !== ids.length) throw notFound('No se encontraron todos los usuarios seleccionados.');
      return { version: 1, exportedAt: now().toISOString(), sections: [...new Set(sections)], data };
    },
  };
}

module.exports = { createProfileExportService };
