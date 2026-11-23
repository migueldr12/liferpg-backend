const { ValidationError } = require('../errors');

// Entidad: una versión publicada de la economía global (RF043).
// XP(n) = base × n^exponente es la XP que pide el nivel n (RDF134, RDF135).
// Los puntos por dificultad los usan hábitos y misiones; el rango de precio lo usa la
// tienda para las recompensas personalizadas (M04, RDF054) (RDF136).
// Cada publicación es una versión NUEVA: las anteriores no se modifican (no retroactivo).

const MAX_LEVEL = 50;
const EXPONENT_MIN = 1;
const EXPONENT_MAX = 2.5;
const DIFFICULTIES = ['facil', 'media', 'dificil', 'epica'];

// Valores con los que arranca el juego mientras no se publique ninguna versión
const DEFAULT_ECONOMY = {
  version: 0,
  base: 100,
  exponent: 1.5,
  difficultyPoints: { facil: 10, media: 25, dificil: 50, epica: 100 },
  rewardPrice: { min: 50, max: 800 },
  publishedAt: null,
};

const isPositiveNumber = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;
const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

class EconomyVersion {
  constructor({ id = null, version, base, exponent, difficultyPoints, rewardPrice, publishedAt = null, publishedById = null }) {
    if (!isPositiveNumber(base)) throw new ValidationError('La base debe ser mayor a 0.');
    if (!(typeof exponent === 'number' && exponent >= EXPONENT_MIN && exponent <= EXPONENT_MAX)) {
      throw new ValidationError(`El exponente debe estar entre ${EXPONENT_MIN.toFixed(1)} y ${EXPONENT_MAX}.`);
    }
    const points = difficultyPoints ?? {};
    for (const key of DIFFICULTIES) {
      if (!isPositiveInt(points[key])) throw new ValidationError('Los puntos por dificultad deben ser enteros mayores a 0.');
    }
    const { min, max } = rewardPrice ?? {};
    if (!isPositiveInt(min) || !isPositiveInt(max) || min >= max) {
      throw new ValidationError('El precio mínimo debe ser mayor a 0 y menor que el máximo (enteros).');
    }

    this.id = id;
    this.version = version;
    this.base = base;
    this.exponent = exponent;
    this.difficultyPoints = Object.fromEntries(DIFFICULTIES.map((k) => [k, points[k]]));
    this.rewardPrice = { min, max };
    this.publishedAt = publishedAt; // ISO 8601 o null (valores por defecto)
    this.publishedById = publishedById;
  }

  // XP que pide el nivel n (1 a 50)
  xpForLevel(level) {
    return Math.round(this.base * level ** this.exponent);
  }

  // Tabla de la curva (RDF134)
  curve() {
    return Array.from({ length: MAX_LEVEL }, (_, i) => ({ level: i + 1, xp: this.xpForLevel(i + 1) }));
  }
}

module.exports = { EconomyVersion, DEFAULT_ECONOMY, DIFFICULTIES, MAX_LEVEL, EXPONENT_MIN, EXPONENT_MAX };
