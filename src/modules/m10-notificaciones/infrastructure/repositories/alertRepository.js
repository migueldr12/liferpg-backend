const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');

const include = { user: { select: { id: true, displayName: true, profile: { select: { alias: true } } } } };

function createAlertRepository(getDb = getPrisma) {
  return {
    create: ({ userId, message, thresholdDays }) =>
      getDb().inactivityAlert.create({ data: { userId, kind: 'INACTIVITY', message, thresholdDays }, include }),

    // Usuarios que ya tienen un aviso de inactividad sin resolver (evita duplicados).
    async findOpenUserIds(userIds) {
      if (!userIds.length) return new Set();
      const rows = await getDb().inactivityAlert.findMany({
        where: { userId: { in: userIds }, kind: 'INACTIVITY', OR: [{ resolvedAt: null }, { resolvedAt: { isSet: false } }] },
        select: { userId: true },
      });
      return new Set(rows.map((r) => r.userId));
    },

    async resolveOpenForUsers(userIds, now = new Date()) {
      if (!userIds.length) return 0;
      const result = await getDb().inactivityAlert.updateMany({
        where: { userId: { in: userIds }, kind: 'INACTIVITY', OR: [{ resolvedAt: null }, { resolvedAt: { isSet: false } }] },
        data: { resolvedAt: now },
      });
      return result.count;
    },

    async list({ userIds, includeResolved, skip, take }) {
      const db = getDb();
      const where = { userId: { in: userIds }, kind: 'INACTIVITY', ...(!includeResolved && { OR: [{ resolvedAt: null }, { resolvedAt: { isSet: false } }] }) };
      const [items, total] = await Promise.all([
        db.inactivityAlert.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take }),
        db.inactivityAlert.count({ where }),
      ]);
      return { items, total };
    },
  };
}

module.exports = { createAlertRepository };
