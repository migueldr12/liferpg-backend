// Contrato del repositorio del M06: QUÉ operaciones de datos existen, no CÓMO se hacen.
// Implementaciones: PrismaMoodRepository (MongoDB, la real) e InMemoryMoodRepository (pruebas).
// Los servicios solo dependen de este contrato, por eso cambiar de BD no los afecta.
//
// - Las fechas son texto AAAA-MM-DD; el repositorio las convierte a lo que use la base.
// - saveLog y saveEntry crean si la entidad viene con id null y actualizan si trae id.
//   Devuelven la entidad guardada, ya con el id que le dio la base.
// - saveLog recibe xpAwarded: si es mayor que 0, lo suma al XP del perfil en la misma operación.

class MoodRepository {
  // Registros de ánimo
  async findLogByDate(userId, date) { throw new Error('No implementado'); }
  async findLogsBetween(userId, fromDate, toDate) { throw new Error('No implementado'); }
  async saveLog(moodLog, { xpAwarded = 0 } = {}) { throw new Error('No implementado'); }

  // Recordatorio diario
  async getReminder(userId) { throw new Error('No implementado'); }
  async saveReminder(userId, reminder) { throw new Error('No implementado'); }

  // Diario
  async findEntries(userId) { throw new Error('No implementado'); }
  async findEntryById(userId, id) { throw new Error('No implementado'); }
  async saveEntry(entry) { throw new Error('No implementado'); }
  async deleteEntry(userId, id) { throw new Error('No implementado'); }
}

module.exports = { MoodRepository };
