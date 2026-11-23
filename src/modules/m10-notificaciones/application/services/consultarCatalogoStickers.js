const { toCatalogGroups } = require('../../infrastructure/mappers/m10Mappers');

// RDF107 · Lista los stickers disponibles, agrupados por categoría.
function createConsultarCatalogoStickers({ stickers }) {
  return async ({ categoryId } = {}) => toCatalogGroups(await stickers.listCatalog({ categoryId }));
}

module.exports = { createConsultarCatalogoStickers };
