const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

// Todos los repositorios reciben una función que devuelve el cliente de Prisma, y la llaman
// en cada operación: así crear el router no abre la conexión a MongoDB.
function createUserRepository(getDb = getPrisma) {
  return {
    findAuthUser: (id) =>
      getDb().user.findUnique({
        where: { id },
        select: { id: true, displayName: true, role: true, status: true, deletedAt: true },
      }),
  };
}

module.exports = { createUserRepository };
