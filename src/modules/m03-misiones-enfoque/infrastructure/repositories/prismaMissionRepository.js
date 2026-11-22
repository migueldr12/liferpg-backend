const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { conflict } = require('../../../../shared/errors/AppError');
const { assertMissionRepository } = require('../../domain/repositories/missionRepository');
const { toMission, toSession, toProfilePoints, toDb, PROFILE_POINTS } = require('../mappers/missionMapper');

// La última sesión se incluye para saber por qué falló una misión
const withLastSession = { focusSessions: { orderBy: { startedAt: 'desc' }, take: 1 } };

// Implementación del repositorio del M03 con Prisma (MongoDB Atlas).
// El cliente se pide al usarse, así crear la app no abre una conexión.
function createPrismaMissionRepository(dbOverride) {
  const db = () => dbOverride ?? getPrisma();

  const repo = {
    async listActive(userId, { type } = {}) {
      const docs = await db().mission.findMany({
        where: { userId, status: 'PENDING', ...(type && { area: toDb.area[type] }) },
        orderBy: { createdAt: 'desc' },
      });
      return docs.map(toMission);
    },

    async findMission(userId, missionId) {
      const doc = await db().mission.findFirst({ where: { id: missionId, userId }, include: withLastSession });
      return toMission(doc);
    },

    async createMission({ userId, title, type, durationMin }) {
      const doc = await db().mission.create({
        data: { userId, title, area: toDb.area[type], estimatedMinutes: durationMin },
      });
      return toMission(doc);
    },

    async listHistory(userId, { status, type, from, to, limit = 50 } = {}) {
      const range = from || to ? { ...(from && { gte: from }), ...(to && { lte: to }) } : undefined;
      const docs = await db().mission.findMany({
        where: {
          userId,
          status: status ? toDb.status[status] : { in: ['COMPLETED', 'FAILED'] },
          ...(type && { area: toDb.area[type] }),
          ...(range && { OR: [{ completedAt: range }, { failedAt: range }] }),
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: withLastSession,
      });
      return docs.map(toMission);
    },

    async findRunningSession(userId) {
      const doc = await db().focusSession.findFirst({ where: { userId, status: 'RUNNING' } });
      return toSession(doc);
    },

    async findSession(userId, sessionId) {
      const doc = await db().focusSession.findFirst({ where: { id: sessionId, userId } });
      return toSession(doc);
    },

    async hasCompletedSession(missionId) {
      const count = await db().focusSession.count({ where: { missionId, status: 'COMPLETED' } });
      return count > 0;
    },

    async startSession({ userId, missionId, plannedMinutes, at }) {
      const doc = await db().focusSession.create({ data: { userId, missionId, plannedMinutes, startedAt: at } });
      return toSession(doc);
    },

    // RDF040: la sesión queda abandonada y la misión fallida, todo o nada
    async abandonSession({ sessionId, missionId, reason, at }) {
      return db().$transaction(async (tx) => {
        const closed = await tx.focusSession.updateMany({
          where: { id: sessionId, status: 'RUNNING' },
          data: { status: 'ABANDONED', endedAt: at, abandonReason: reason },
        });
        if (closed.count === 0) throw conflict('La sesión ya terminó.');
        await tx.mission.update({ where: { id: missionId }, data: { status: 'FAILED', failedAt: at } });
        const [mission, session] = await Promise.all([
          tx.mission.findUnique({ where: { id: missionId }, include: withLastSession }),
          tx.focusSession.findUnique({ where: { id: sessionId } }),
        ]);
        return { mission: toMission(mission), session: toSession(session) };
      });
    },

    async completeSession({ sessionId, at }) {
      const closed = await db().focusSession.updateMany({
        where: { id: sessionId, status: 'RUNNING' },
        data: { status: 'COMPLETED', endedAt: at },
      });
      if (closed.count === 0) throw conflict('La sesión ya terminó.');
      return toSession(await db().focusSession.findUnique({ where: { id: sessionId } }));
    },

    // RDF041 / RDF043: misión completada y puntos al perfil, todo o nada.
    // La recompensa se copia en la misión para que un cambio de reglas no reescriba el pasado.
    async completeMission({ userId, missionId, sessionId, validation, activity, reward, at }) {
      return db().$transaction(async (tx) => {
        const profile = await tx.playerProfile.findUnique({ where: { userId } });
        if (!profile) throw conflict('El jugador todavía no tiene perfil (M01).');

        const done = await tx.mission.updateMany({
          where: { id: missionId, userId, status: 'PENDING' },
          data: {
            status: 'COMPLETED',
            completedAt: at,
            xpAwarded: reward.xp,
            pointsAwarded: reward.points,
            validationMethod: toDb.validation[validation],
            ...(activity && { wearableActivity: activity }),
          },
        });
        if (done.count === 0) throw conflict('La misión ya no está activa.');

        if (sessionId) {
          await tx.focusSession.update({ where: { id: sessionId }, data: { xpAwarded: reward.xp, pointsAwarded: reward.points } });
        }

        const mission = await tx.mission.findUnique({ where: { id: missionId }, include: withLastSession });
        const updated = await tx.playerProfile.update({
          where: { userId },
          data: { xp: { increment: reward.xp }, [PROFILE_POINTS[toMission(mission).type]]: { increment: reward.points } },
        });
        return { mission: toMission(mission), profile: toProfilePoints(updated) };
      });
    },
  };

  return assertMissionRepository(repo);
}

module.exports = { createPrismaMissionRepository };
