const { randomUUID } = require('node:crypto');
const { MoodRepository } = require('../../src/modules/m06-vitalidad/domain/repositories/MoodRepository');

// Implementación EN MEMORIA del contrato MoodRepository.
// Solo para pruebas: los datos se pierden al terminar.
// La implementación real es PrismaMoodRepository (MongoDB).

class InMemoryMoodRepository extends MoodRepository {
  // Puede arrancar con datos (p. ej. los de ejemplo de infrastructure/seed)
  constructor({ logs = [], entries = [] } = {}) {
    super();
    this.logs = new Map(logs.map((l) => [`${l.userId}|${l.date}`, l])); // "userId|AAAA-MM-DD" → MoodLog
    this.reminders = new Map(); // userId → { enabled, time }
    this.entries = new Map(entries.map((e) => [e.id, e])); // id → JournalEntry
    this.xp = new Map(); // userId → XP ganado (en la base real va al perfil del jugador)
  }

  async findLogByDate(userId, date) {
    return this.logs.get(`${userId}|${date}`) ?? null;
  }

  async findLogsBetween(userId, fromDate, toDate) {
    return [...this.logs.values()].filter((l) => l.userId === userId && l.date >= fromDate && l.date <= toDate);
  }

  async saveLog(moodLog, { xpAwarded = 0 } = {}) {
    moodLog.id ??= randomUUID();
    this.logs.set(`${moodLog.userId}|${moodLog.date}`, moodLog);
    if (xpAwarded > 0) this.xp.set(moodLog.userId, (this.xp.get(moodLog.userId) ?? 0) + xpAwarded);
    return moodLog;
  }

  async getReminder(userId) {
    return this.reminders.get(userId) ?? null;
  }

  async saveReminder(userId, reminder) {
    this.reminders.set(userId, { ...reminder });
    return reminder;
  }

  async findEntries(userId) {
    return [...this.entries.values()].filter((e) => e.userId === userId);
  }

  async findEntryById(userId, id) {
    const entry = this.entries.get(id);
    return entry && entry.userId === userId ? entry : null; // Solo el dueño la ve
  }

  async saveEntry(entry) {
    entry.id ??= randomUUID();
    this.entries.set(entry.id, entry);
    return entry;
  }

  async deleteEntry(userId, id) {
    const entry = this.entries.get(id);
    if (entry && entry.userId === userId) this.entries.delete(id);
  }
}

module.exports = { InMemoryMoodRepository };
