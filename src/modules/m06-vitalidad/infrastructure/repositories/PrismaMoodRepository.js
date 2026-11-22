const { MoodRepository } = require('../../domain/repositories/MoodRepository');
const { MoodLog } = require('../../domain/entities/MoodLog');
const { JournalEntry } = require('../../domain/entities/JournalEntry');
const { NotFoundError, UnauthorizedError } = require('../../domain/errors');
const { ZONA_POR_DEFECTO, toDateKey, dateKeyToDayStart, dayStartToDateKey } = require('../../domain/fechas');

// Implementación REAL del contrato MoodRepository: MongoDB Atlas con Prisma
// (prisma/schema.prisma). Colecciones que usa:
//   mood_logs        → MoodLog       (un registro por usuario y día: @@unique([userId, dayStart]))
//   journal_entries  → JournalEntry  (entradas del diario; moodLogId liga la primera del día)
//   player_profiles  → moodReminderEnabled, moodReminderTime (RDF070) y xp (+5 por registro)
//
// Recibe el cliente de Prisma (src/shared/infrastructure/database/prisma.js); los servicios
// no saben que existe. Aquí se convierte documento de la base ↔ entidad del dominio.

const OBJECT_ID = /^[a-f\d]{24}$/i;

class PrismaMoodRepository extends MoodRepository {
  /**
   * db: el cliente de Prisma o una función que lo da (getPrisma). Con la función, el cliente
   * se crea hasta la primera consulta y encender el servidor o las pruebas no lo necesita.
   * @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient), timeZone?: string }} options
   */
  constructor({ db, timeZone = ZONA_POR_DEFECTO }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
    this.timeZone = timeZone;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  // ───────── Registros de ánimo ─────────

  async findLogByDate(userId, date) {
    const row = await this.db.moodLog.findUnique({
      where: { userId_dayStart: { userId: usuario(userId), dayStart: dateKeyToDayStart(date) } },
    });
    return row ? toMoodLog(row) : null;
  }

  async findLogsBetween(userId, fromDate, toDate) {
    const rows = await this.db.moodLog.findMany({
      where: { userId: usuario(userId), dayStart: { gte: dateKeyToDayStart(fromDate), lte: dateKeyToDayStart(toDate) } },
      orderBy: { dayStart: 'asc' },
    });
    return rows.map(toMoodLog);
  }

  async saveLog(log, { xpAwarded = 0 } = {}) {
    const values = { mood: log.mood, energy: log.energy, factors: log.factors };

    if (log.id) {
      const row = await this.db.moodLog.update({ where: { id: log.id }, data: values });
      return toMoodLog(row);
    }

    const create = this.db.moodLog.create({
      data: {
        userId: usuario(log.userId),
        dayStart: dateKeyToDayStart(log.date),
        createdAt: new Date(log.createdAt),
        ...values,
      },
    });
    if (!(xpAwarded > 0)) return toMoodLog(await create);

    // Registro + XP del perfil en una sola transacción: o se guardan los dos o ninguno
    const [row] = await this.db.$transaction([
      create,
      this.db.playerProfile.updateMany({ where: { userId: log.userId }, data: { xp: { increment: xpAwarded } } }),
    ]);
    return toMoodLog(row);
  }

  // ───────── Recordatorio diario (vive en el perfil del jugador) ─────────

  async getReminder(userId) {
    const profile = await this.db.playerProfile.findUnique({
      where: { userId: usuario(userId) },
      select: { moodReminderEnabled: true, moodReminderTime: true },
    });
    return profile ? { enabled: profile.moodReminderEnabled, time: profile.moodReminderTime } : null;
  }

  async saveReminder(userId, { enabled, time }) {
    const { count } = await this.db.playerProfile.updateMany({
      where: { userId: usuario(userId) },
      data: { moodReminderEnabled: enabled, moodReminderTime: time },
    });
    if (!count) throw new NotFoundError('Primero crea tu perfil de jugador.');
    return { enabled, time };
  }

  // ───────── Diario ─────────

  async findEntries(userId) {
    const rows = await this.db.journalEntry.findMany({
      where: { userId: usuario(userId) },
      orderBy: { createdAt: 'desc' },
    });
    return this.conAnimoDelDia(userId, rows);
  }

  async findEntryById(userId, id) {
    if (!OBJECT_ID.test(id ?? '')) return null; // Un id mal formado no existe
    const row = await this.db.journalEntry.findFirst({ where: { id, userId: usuario(userId) } });
    if (!row) return null;
    const [entry] = await this.conAnimoDelDia(userId, [row]);
    return entry;
  }

  async saveEntry(entry) {
    if (entry.id) {
      const row = await this.db.journalEntry.update({
        where: { id: entry.id },
        data: { text: entry.text, shared: entry.shared },
      });
      const [saved] = await this.conAnimoDelDia(entry.userId, [row]);
      return saved;
    }

    // moodLogId es único: solo la primera entrada del día queda ligada al registro.
    // Las demás se relacionan con él por la fecha (conAnimoDelDia).
    const log = await this.db.moodLog.findUnique({
      where: { userId_dayStart: { userId: usuario(entry.userId), dayStart: dateKeyToDayStart(entry.date) } },
      include: { journalEntry: { select: { id: true } } },
    });
    const row = await this.db.journalEntry.create({
      data: {
        userId: entry.userId,
        moodLogId: log && !log.journalEntry ? log.id : null,
        text: entry.text,
        shared: entry.shared,
        createdAt: new Date(entry.createdAt),
      },
    });
    const [saved] = await this.conAnimoDelDia(entry.userId, [row]);
    return saved;
  }

  async deleteEntry(userId, id) {
    if (!OBJECT_ID.test(id ?? '')) return;
    await this.db.journalEntry.deleteMany({ where: { id, userId: usuario(userId) } });
  }

  // Pone a cada entrada el ánimo y la energía del registro de su día (si lo hubo)
  async conAnimoDelDia(userId, rows) {
    if (!rows.length) return [];
    const withDate = rows.map((row) => ({ row, date: toDateKey(row.createdAt, this.timeZone) }));
    const days = [...new Set(withDate.map((x) => x.date))].map(dateKeyToDayStart);
    const logs = await this.db.moodLog.findMany({ where: { userId: usuario(userId), dayStart: { in: days } } });
    const byDate = new Map(logs.map((l) => [dayStartToDateKey(l.dayStart), l]));

    return withDate.map(({ row, date }) => {
      const log = byDate.get(date);
      return new JournalEntry({
        id: row.id,
        userId: row.userId,
        date,
        createdAt: row.createdAt.toISOString(),
        text: row.text,
        mood: log ? log.mood : null,
        energy: log ? log.energy : null,
        shared: row.shared,
      });
    });
  }
}

// En MongoDB los usuarios tienen un _id de 24 caracteres hexadecimales. El middleware
// currentUser ya lo revisa; esta segunda revisión evita consultas inválidas a la base.
function usuario(userId) {
  if (!OBJECT_ID.test(userId ?? '')) {
    throw new UnauthorizedError('El usuario no es válido: se espera el _id de un usuario de la base.');
  }
  return userId;
}

const toMoodLog = (row) =>
  new MoodLog({
    id: row.id,
    userId: row.userId,
    date: dayStartToDateKey(row.dayStart),
    createdAt: row.createdAt.toISOString(),
    mood: row.mood,
    energy: row.energy,
    factors: row.factors ?? [],
  });

module.exports = { PrismaMoodRepository };
