// DTOs de salida del M06: la forma exacta en la que la API responde.
// Coinciden con los modelos de la app móvil (src/models/MoodLog.ts).
// Separan la entidad interna de lo que se expone (p. ej. no se envía userId).

// Sin registro devuelve null (así responde GET /animo/hoy)
const toMoodLogDto = (log) =>
  log
    ? {
        id: log.id,
        date: log.date,
        createdAt: log.createdAt,
        mood: log.mood,
        energy: log.energy,
        factors: log.factors,
      }
    : null;

const toJournalEntryDto = (entry) => ({
  id: entry.id,
  date: entry.date,
  createdAt: entry.createdAt,
  text: entry.text,
  mood: entry.mood,
  energy: entry.energy,
  shared: entry.shared,
});

module.exports = { toMoodLogDto, toJournalEntryDto };
