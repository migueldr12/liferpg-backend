const { CatalogCategory } = require('../../domain/entities/CatalogCategory');
const { CatalogItem } = require('../../domain/entities/CatalogItem');
const { ConflictError, NotFoundError } = require('../../domain/errors');

// 14.2 Gestión de catálogo (RF044).

const mismoNombre = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

function makeConsultarCategorias({ catalogRepository }) {
  return async function consultarCategorias() {
    return catalogRepository.listCategories();
  };
}

// RDF137 · agregarCategoria: nombre único dentro de su tipo
function makeAgregarCategoria({ catalogRepository }) {
  return async function agregarCategoria({ name, type, icon }) {
    const category = new CatalogCategory({ name, type, icon });
    if (await catalogRepository.findCategoryByName(category.name, category.type)) {
      throw new ConflictError('Ya existe una categoría con ese nombre.');
    }
    return catalogRepository.saveCategory(category);
  };
}

// RDF138 · actualizarCategoria (modificar). Una categoría en uso no cambia de tipo,
// porque dejaría hábitos o artículos en una categoría que no les corresponde.
function makeActualizarCategoria({ catalogRepository }) {
  return async function actualizarCategoria(id, { name, type, icon }) {
    const current = await catalogRepository.findCategoryById(id);
    if (!current) throw new NotFoundError('La categoría no existe.');
    const updated = new CatalogCategory({ id, name, type, icon, inUse: current.inUse });
    if (current.inUse > 0 && updated.type !== current.type) {
      throw new ConflictError(`"${current.name}" está en uso (${current.inUse}); no se puede cambiar de tipo.`);
    }
    const twin = await catalogRepository.findCategoryByName(updated.name, updated.type);
    if (twin && twin.id !== id) throw new ConflictError('Ya existe una categoría con ese nombre.');
    return catalogRepository.saveCategory(updated);
  };
}

// RDF138 · actualizarCategoria (eliminar): solo si ningún hábito, misión o artículo la usa
function makeEliminarCategoria({ catalogRepository }) {
  return async function eliminarCategoria(id) {
    const current = await catalogRepository.findCategoryById(id);
    if (!current) throw new NotFoundError('La categoría no existe.');
    if (current.inUse > 0) {
      throw new ConflictError(`"${current.name}" está en uso (${current.inUse}); no se puede eliminar.`);
    }
    await catalogRepository.deleteCategory(id);
  };
}

function makeConsultarArticulos({ catalogRepository }) {
  return async function consultarArticulos() {
    return catalogRepository.listItems();
  };
}

// RDF140 · administrarArticulosCatalogo (alta). La PWA manda una sola etiqueta en "tag".
function makeAgregarArticulo({ catalogRepository }) {
  return async function agregarArticulo({ name, group, icon, price, tag, tags }) {
    const item = new CatalogItem({ name, group, icon, price, tags: tags ?? (tag ? [tag] : []) });
    return catalogRepository.saveItem(item);
  };
}

// RDF140 · administrarArticulosCatalogo (editar y activar/desactivar)
function makeActualizarArticulo({ catalogRepository }) {
  return async function actualizarArticulo(id, changes) {
    const current = await catalogRepository.findItemById(id);
    if (!current) throw new NotFoundError('El artículo no existe.');
    const updated = new CatalogItem({
      ...current,
      name: changes.name ?? current.name,
      icon: changes.icon ?? current.icon,
      price: changes.price ?? current.price,
      tags: changes.tags ?? current.tags,
      active: changes.active ?? current.active,
    });
    return catalogRepository.saveItem(updated);
  };
}

module.exports = {
  makeConsultarCategorias,
  makeAgregarCategoria,
  makeActualizarCategoria,
  makeEliminarCategoria,
  makeConsultarArticulos,
  makeAgregarArticulo,
  makeActualizarArticulo,
};
