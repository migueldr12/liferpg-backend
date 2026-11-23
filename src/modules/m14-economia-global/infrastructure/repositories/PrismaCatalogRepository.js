const { CatalogRepository } = require('../../domain/repositories/EconomyRepository');
const { CATEGORY_TYPE_TO_DB, toCatalogCategory, toCatalogItem } = require('../mappers/economiaMapper');

// Catálogo en MongoDB: catalog_categories y catalog_items.
// "inUse" de una categoría = hábitos + misiones + artículos que la tienen asignada.
// Los artículos con custom = true son recompensas personalizadas de un jugador (M04):
// no son parte del catálogo global y no se listan aquí.

const OBJECT_ID = /^[a-f\d]{24}$/i;

class PrismaCatalogRepository extends CatalogRepository {
  /** @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient) }} options */
  constructor({ db }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  // ───────── Categorías ─────────

  async listCategories() {
    const rows = await this.db.catalogCategory.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    const uses = await this.contarUsos(rows.map((r) => r.id));
    return rows.map((row) => toCatalogCategory(row, uses.get(row.id) ?? 0));
  }

  async findCategoryById(id) {
    if (!OBJECT_ID.test(id ?? '')) return null;
    const row = await this.db.catalogCategory.findUnique({ where: { id } });
    if (!row) return null;
    const uses = await this.contarUsos([id]);
    return toCatalogCategory(row, uses.get(id) ?? 0);
  }

  async findCategoryByName(name, type) {
    const row = await this.db.catalogCategory.findFirst({
      where: { type: CATEGORY_TYPE_TO_DB[type], name: { equals: name, mode: 'insensitive' } },
    });
    return row ? toCatalogCategory(row) : null;
  }

  async saveCategory(category) {
    const data = { name: category.name, type: CATEGORY_TYPE_TO_DB[category.type], icon: category.icon };
    const row = category.id
      ? await this.db.catalogCategory.update({ where: { id: category.id }, data })
      : await this.db.catalogCategory.create({ data });
    return toCatalogCategory(row, category.inUse);
  }

  async deleteCategory(id) {
    await this.db.catalogCategory.delete({ where: { id } });
  }

  // Cuántos hábitos, misiones y artículos usan cada categoría
  async contarUsos(ids) {
    const uses = new Map();
    if (!ids.length) return uses;
    const where = { categoryId: { in: ids } };
    const select = { categoryId: true };
    const [habits, missions, items] = await Promise.all([
      this.db.habit.findMany({ where, select }),
      this.db.mission.findMany({ where, select }),
      this.db.catalogItem.findMany({ where, select }),
    ]);
    for (const { categoryId } of [...habits, ...missions, ...items]) {
      uses.set(categoryId, (uses.get(categoryId) ?? 0) + 1);
    }
    return uses;
  }

  // ───────── Artículos ─────────

  async listItems() {
    const rows = await this.db.catalogItem.findMany({ where: { custom: false }, orderBy: { name: 'asc' } });
    return rows.map(toCatalogItem);
  }

  async findItemById(id) {
    if (!OBJECT_ID.test(id ?? '')) return null;
    const row = await this.db.catalogItem.findFirst({ where: { id, custom: false } });
    return row ? toCatalogItem(row) : null;
  }

  async saveItem(item) {
    const data = {
      name: item.name,
      icon: item.icon,
      price: item.price,
      tags: item.tags,
      active: item.active,
      giftable: item.giftable,
    };
    const row = item.id
      ? await this.db.catalogItem.update({ where: { id: item.id }, data })
      : await this.db.catalogItem.create({ data: { ...data, group: item.group, custom: false } });
    return toCatalogItem(row);
  }
}

module.exports = { PrismaCatalogRepository };
