const { ActivityRepository } = require('../../domain/repositories/RetosRepository');
const { AREA_FROM_DB, FREQUENCY_FROM_DB } = require('../mappers/retosMapper');

// Lectura de la actividad de los jugadores para el M12: hábitos (M02), misiones y
// sesiones de enfoque (M03). Solo lee; nunca modifica esas colecciones.
// Ventana [from, to): incluye "from" y excluye "to".

class PrismaActivityRepository extends ActivityRepository {
  /** @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient) }} options */
  constructor({ db }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  async findActivity(userIds, { from, to }) {
    const vacio = { habits: [], checkIns: [], missions: [], sessions: [] };
    if (!userIds.length) return vacio;
    const enVentana = { gte: from, lt: to };
    const usuarios = { userId: { in: userIds } };

    const [habits, checkIns, missions, sessions] = await Promise.all([
      this.db.habit.findMany({
        where: usuarios,
        select: { id: true, userId: true, area: true, frequency: true, active: true, startsOn: true, archivedAt: true },
      }),
      this.db.habitCheckIn.findMany({
        where: { ...usuarios, completedAt: enVentana },
        select: { id: true, userId: true, habitId: true, completedAt: true, xpAwarded: true, pointsAwarded: true, revertedAt: true },
      }),
      this.db.mission.findMany({
        where: { ...usuarios, status: { in: ['COMPLETED', 'FAILED'] }, OR: [{ completedAt: enVentana }, { failedAt: enVentana }] },
        select: { id: true, userId: true, area: true, status: true, completedAt: true, failedAt: true, xpAwarded: true, pointsAwarded: true },
      }),
      this.db.focusSession.findMany({
        where: { ...usuarios, status: 'COMPLETED', endedAt: enVentana },
        select: { id: true, userId: true, habitId: true, missionId: true, plannedMinutes: true, endedAt: true },
      }),
    ]);

    // Área de cada sesión: la de su hábito o la de su misión
    const areaHabito = new Map(habits.map((h) => [h.id, AREA_FROM_DB[h.area]]));
    const missionIds = [...new Set(sessions.map((s) => s.missionId).filter(Boolean))];
    const areaMision = new Map(
      (missionIds.length
        ? await this.db.mission.findMany({ where: { id: { in: missionIds } }, select: { id: true, area: true } })
        : []
      ).map((m) => [m.id, AREA_FROM_DB[m.area]]),
    );

    return {
      habits: habits.map((h) => ({
        id: h.id,
        userId: h.userId,
        area: AREA_FROM_DB[h.area],
        frequency: FREQUENCY_FROM_DB[h.frequency] ?? 'diario',
        active: h.active,
        startsOn: h.startsOn,
        archivedAt: h.archivedAt ?? null,
      })),
      checkIns: checkIns
        .filter((c) => !c.revertedAt)
        .map((c) => ({ id: c.id, userId: c.userId, habitId: c.habitId, completedAt: c.completedAt, xp: c.xpAwarded, points: c.pointsAwarded })),
      missions: missions.map((m) => ({
        id: m.id,
        userId: m.userId,
        area: AREA_FROM_DB[m.area],
        status: m.status === 'COMPLETED' ? 'completada' : 'fallida',
        at: m.completedAt ?? m.failedAt,
        xp: m.xpAwarded,
        points: m.pointsAwarded,
      })),
      sessions: sessions
        .map((s) => ({
          id: s.id,
          userId: s.userId,
          area: (s.habitId && areaHabito.get(s.habitId)) || (s.missionId && areaMision.get(s.missionId)) || null,
          minutes: s.plannedMinutes,
          endedAt: s.endedAt,
        }))
        .filter((s) => s.area),
    };
  }
}

module.exports = { PrismaActivityRepository };
