const { ValidationError } = require('../errors');

// Entidad: categoría del catálogo (RDF137, RDF138). Agrupa hábitos, misiones,
// artículos de la tienda o stickers. Solo se puede borrar si nada la usa.

const CATEGORY_TYPES = ['habitos', 'misiones', 'tienda', 'stickers'];
const NAME_MAX = 40;

class CatalogCategory {
  constructor({ id = null, name, type, icon, inUse = 0 }) {
    const clean = typeof name === 'string' ? name.trim() : '';
    if (!clean) throw new ValidationError('Escribe el nombre de la categoría.');
    if (clean.length > NAME_MAX) throw new ValidationError(`El nombre no puede pasar de ${NAME_MAX} caracteres.`);
    if (!CATEGORY_TYPES.includes(type)) throw new ValidationError('El tipo debe ser habitos, misiones, tienda o stickers.');
    if (typeof icon !== 'string' || !icon.trim()) throw new ValidationError('Elige un ícono.');
    this.id = id;
    this.name = clean;
    this.type = type;
    this.icon = icon.trim();
    this.inUse = inUse; // Hábitos, misiones y artículos que la usan
  }
}

module.exports = { CatalogCategory, CATEGORY_TYPES, NAME_MAX };
