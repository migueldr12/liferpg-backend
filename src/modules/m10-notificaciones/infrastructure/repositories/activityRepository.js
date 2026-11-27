const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

// Lecturas de solo consulta sobre M02, M03 y M11 para decidir si un jugador está inactivo.
function createActivityRepository(getDb = getPrisma) {
  return {
    // Jugadores activos con cuenta anterior a la ventana (una cuenta nueva no es "inactiva").
    listCandidates: ({ createdBefore }) =>
      getDb().user.findMany({
        where: { role: 'PLAYER', status: 'ACTIVE', OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }], createdAt: { lte: createdBefore } },
        select: { id: true, displayName: true },
      }),

    // Cuenta check-ins (no revertidos), misiones completadas y enfoques completados desde `since`.
    async countActivityByUser({ since }) {
      const db = getDb();
      const [checkIns, missions, focus] = await Promise.all([
        db.habitCheckIn.findMany({ where: { completedAt: { gte: since }, OR: [{ revertedAt: null }, { revertedAt: { isSet: false } }] }, select: { userId: true } }),
        db.mission.findMany({ where: { completedAt: { gte: since } }, select: { userId: true } }),
        db.focusSession.findMany({ where: { startedAt: { gte: since }, status: 'COMPLETED' }, select: { userId: true } }),
      ]);
      const counts = new Map();
      for (const { userId } of [...checkIns, ...missions, ...focus]) counts.set(userId, (counts.get(userId) ?? 0) + 1);
      return counts;
    },

    // Tasas de cumplimiento de los cierres diarios (M11) desde `since`.
    async completionRatesByUser({ since }) {
      const rows = await getDb().dailyClosure.findMany({
        where: { dayStart: { gte: since } },
        select: { userId: true, completionRate: true },
      });
      const rates = new Map();
      for (const { userId, completionRate } of rows) {
        if (!rates.has(userId)) rates.set(userId, []);
        rates.get(userId).push(completionRate / 100);
      }
      return rates;
    },
  };
}

module.exports = { createActivityRepository };
