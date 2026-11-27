const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

function createHostRepository(getDb = getPrisma) {
  return {
    listDevices: () => getDb().device.findMany({
      where: { active: true },
      select: { id: true, platform: true, lastSeenAt: true, user: { select: { displayName: true } } },
      orderBy: { lastSeenAt: 'desc' },
      take: 100,
    }),
  };
}

module.exports = { createHostRepository };
