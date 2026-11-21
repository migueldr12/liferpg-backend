const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

// El servicio recibe este repositorio por parámetro y no depende de Prisma.
function createCatalogItemRepository(db = getPrisma()) {
  return {
    list: () => db.catalogItem.findMany({ orderBy: { name: 'asc' } }),
    create: ({ name, group, icon, price, tags = [] }) =>
      db.catalogItem.create({ data: { name, group, icon, price, tags } }),
    setActive: (id, active) => db.catalogItem.update({ where: { id }, data: { active } }),
  };
}

module.exports = { createCatalogItemRepository };
