const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

function createProfileExportRepository(getDb = getPrisma) {
  return {
    listProfiles: () => getDb().user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, displayName: true, profile: { select: { alias: true } } },
      orderBy: { displayName: 'asc' },
      take: 100,
    }),
    async exportProfiles(ids, sections) {
      const db = getDb();
      const users = await db.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, displayName: true, email: true, account: true, createdAt: true },
      });
      const include = (section, model) => sections.includes(section) ? model.findMany({ where: { userId: { in: ids } } }) : Promise.resolve([]);
      const [profiles, outfits, habits, checkIns, missions, sessions, inventory] = await Promise.all([
        include('profile', db.playerProfile), include('profile', db.outfit),
        include('habits', db.habit), include('habits', db.habitCheckIn),
        include('missions', db.mission), include('missions', db.focusSession),
        include('inventory', db.inventoryEntry),
      ]);
      return { users, profiles, outfits, habits, checkIns, missions, sessions, inventory };
    },
  };
}

module.exports = { createProfileExportRepository };
