const { ValidationError } = require('../errors');

// Entidad: entrada del diario rápido (RDF075 a RDF078).

const TEXT_MAX = 500;

class JournalEntry {
  constructor({ id, userId, date, createdAt, text, mood = null, energy = null, shared = false }) {
    const clean = typeof text === 'string' ? text.trim() : '';
    if (!clean) throw new ValidationError('La entrada no puede estar vacía.');
    if (clean.length > TEXT_MAX) throw new ValidationError(`La entrada no puede pasar de ${TEXT_MAX} caracteres.`);
    this.id = id;
    this.userId = userId;
    this.date = date; // AAAA-MM-DD
    this.createdAt = createdAt; // ISO 8601
    this.text = clean;
    this.mood = mood; // Ánimo del registro de ese día (si lo hubo)
    this.energy = energy;
    this.shared = Boolean(shared); // Privada por defecto (RDF076)
  }
}

module.exports = { JournalEntry, TEXT_MAX };
