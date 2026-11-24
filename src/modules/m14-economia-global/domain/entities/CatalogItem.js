const { ValidationError } = require('../errors');

// Entidad: artículo del catálogo (RDF140). Alimenta la tienda (M04), el cofre de
// regalos (M08) y los stickers (M10). Se desactiva en lugar de borrarse, porque
// puede estar en inventarios o en el historial.

const ITEM_GROUPS = ['tienda', 'exclusivos', 'regalables', 'stickers'];
const NAME_MAX = 40;
const TAGS_MAX = 5;

class CatalogItem {
  constructor({ id = null, name, group, icon, price, tags = [], active = true }) {
    const clean = typeof name === 'string' ? name.trim() : '';
    if (!clean) throw new ValidationError('Escribe el nombre del artículo.');
    if (clean.length > NAME_MAX) throw new ValidationError(`El nombre no puede pasar de ${NAME_MAX} caracteres.`);
    if (!ITEM_GROUPS.includes(group)) throw new ValidationError('El grupo debe ser tienda, exclusivos, regalables o stickers.');
    if (typeof icon !== 'string' || !icon.trim()) throw new ValidationError('Elige un ícono.');
    if (!Number.isInteger(price) || price < 0) throw new ValidationError('El precio debe ser un entero mayor o igual a 0.');
    const cleanTags = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))];
    if (cleanTags.length > TAGS_MAX) throw new ValidationError(`Máximo ${TAGS_MAX} etiquetas.`);
    this.id = id;
    this.name = clean;
    this.group = group;
    this.icon = icon.trim();
    this.price = price;
    this.tags = cleanTags;
    this.active = Boolean(active);
  }

  // Los regalables pueden pasar de un jugador a otro (M08)
  get giftable() {
    return this.group === 'regalables';
  }
}

module.exports = { CatalogItem, ITEM_GROUPS };
