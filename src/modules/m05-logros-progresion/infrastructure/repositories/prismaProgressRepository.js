const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { dateKeyToUtc } = require('../../../../shared/utils/zonaHoraria');

// Actividad de un usuario en un tramo para RF018 · Tú vs. tú.
// `tramo`: { desde, hasta (exclusivo), primerDia, ultimoDia } (ver domain/comparativaMensual.js).
function createPrismaProgressRepository(db = getPrisma) {
  return {
    async activityBetween(userId, tramo) {
      const enRango = { gte: tramo.desde, lt: tramo.hasta };
      const [checkIns, missions, focusSessions, moods] = await Promise.all([
        db().habitCheckIn.findMany({
          where: { userId, completedAt: enRango },
          select: { completedAt: true, xpAwarded: true, revertedAt: true },
        }),
        db().mission.findMany({
          where: { userId, status: 'COMPLETED', completedAt: enRango },
          select: { completedAt: true, xpAwarded: true },
        }),
        db().focusSession.findMany({
          where: { userId, status: 'COMPLETED', endedAt: enRango },
          select: { endedAt: true, plannedMinutes: true, xpAwarded: true },
        }),
        // mood_logs.dayStart es la medianoche UTC de la fecha local (docs/database.md)
        db().moodLog.findMany({
          where: { userId, dayStart: { gte: dateKeyToUtc(tramo.primerDia), lte: dateKeyToUtc(tramo.ultimoDia) } },
          select: { mood: true },
        }),
      ]);
      // Los check-ins revertidos no cuentan (se filtra aquí: revertedAt puede no existir en el documento)
      return { checkIns: checkIns.filter((c) => !c.revertedAt), missions, focusSessions, moods };
    },
  };
}

module.exports = { createPrismaProgressRepository };
