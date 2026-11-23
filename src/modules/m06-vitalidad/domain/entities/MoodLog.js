const { ValidationError } = require('../errors');

// Entidad: registro de ánimo de un día (RDF068, RDF069).
// Contiene las reglas del negocio; no sabe nada de Express ni de la base de datos.

const MOOD_MIN = 1; // Muy mal
const MOOD_MAX = 5; // Genial
const ENERGY_MIN = 0;
const ENERGY_MAX = 10;
const FACTORS = ['motivada', 'cansada', 'estres_escolar', 'tranquila', 'ansiosa', 'amigos'];

class MoodLog {
  constructor({ id, userId, date, createdAt, mood, energy, factors = [] }) {
    if (!Number.isInteger(mood) || mood < MOOD_MIN || mood > MOOD_MAX) {
      throw new ValidationError(`El ánimo debe ser un entero de ${MOOD_MIN} a ${MOOD_MAX}.`);
    }
    if (!Number.isInteger(energy) || energy < ENERGY_MIN || energy > ENERGY_MAX) {
      throw new ValidationError(`La energía debe ser un entero de ${ENERGY_MIN} a ${ENERGY_MAX}.`);
    }
    const invalid = factors.filter((f) => !FACTORS.includes(f));
    if (invalid.length) {
      throw new ValidationError(`Factores no válidos: ${invalid.join(', ')}.`);
    }
    this.id = id;
    this.userId = userId;
    this.date = date; // AAAA-MM-DD
    this.createdAt = createdAt; // ISO 8601
    this.mood = mood;
    this.energy = energy;
    this.factors = [...new Set(factors)];
  }
}

module.exports = { MoodLog, FACTORS, MOOD_MIN, MOOD_MAX, ENERGY_MIN, ENERGY_MAX };
