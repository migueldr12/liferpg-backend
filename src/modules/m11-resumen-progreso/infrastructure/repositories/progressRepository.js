const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const mapper = require('../mappers/progressMapper');

// Implementación con Prisma del contrato de domain/repositories/ProgressRepository.js.
// Recibe una función que entrega el cliente (no el cliente) para no abrir la conexión
// hasta la primera consulta. Los campos opcionales de fecha se filtran en memoria
// porque en MongoDB pueden faltar en el documento y `null` no los empareja.
function createProgressRepository(getDb = getPrisma) {
  return {
    async findUser(id) {
      return mapper.toUser(await getDb().user.findUnique({
        where: { id },
        select: { id: true, status: true, deletedAt: true },
      }));
    },

    async findProfile(userId) {
      return mapper.toProfile(await getDb().playerProfile.findUnique({
        where: { userId },
        select: { currentStreak: true, bestStreak: true },
      }));
    },

    async areFriends(a, b) {
      const found = await getDb().friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }],
        },
        select: { id: true },
      });
      return Boolean(found);
    },

    async listHabits(userId) {
      return (await getDb().habit.findMany({ where: { userId } })).map(mapper.toHabit);
    },

    async listCheckIns(userId, from, to) {
      const rows = await getDb().habitCheckIn.findMany({
        where: { userId, periodStart: { gte: from, lt: to } },
      });
      return rows.map(mapper.toCheckIn);
    },

    async listMissions(userId, createdBefore) {
      const rows = await getDb().mission.findMany({
        where: { userId, createdAt: { lt: createdBefore } },
      });
      return rows.map(mapper.toMission);
    },

    async listClosures(userId, from, to) {
      const rows = await getDb().dailyClosure.findMany({
        where: { userId, dayStart: { gte: from, lt: to } },
      });
      return rows.map(mapper.toClosure);
    },

    // upsert con update vacío: crea el cierre del día si falta y nunca pisa uno existente
    // (por ejemplo el que escriba el cierre diario de M02 con penaltiesApplied).
    async saveClosure(userId, day) {
      const data = {
        dayEnd: day.dayEnd,
        habitsDue: day.habitsDue,
        habitsCompleted: day.habitsCompleted,
        completionRate: day.completionRate ?? 0,
        pendingCount: day.pendingCount,
      };
      await getDb().dailyClosure.upsert({
        where: { userId_dayStart: { userId, dayStart: day.dayStart } },
        create: { userId, dayStart: day.dayStart, ...data },
        update: {},
      });
    },
  };
}

module.exports = { createProgressRepository };
