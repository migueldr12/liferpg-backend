const { assetOf, itemKey, isSameItem, appIconOf } = require('../../../../shared/domain/catalogItem');

// Reglas puras del Vestidor (M01 · RDF021 y RDF022). La Casa (HUD) y el Vestidor de la app
// leen la misma lista (GET /vestidor/articulos) y buscan la imagen por `asset`; por eso
// cada prenda se identifica con su nombre de imagen (itemKey), igual que en la Tienda (M04).

const SLOT_ES = { HEAD: 'Cabeza', FACE: 'Cara', BODY: 'Cuerpo', BACKGROUND: 'Fondo' };
const POINT_ES = { CULTURE: 'cultura', PHYSICAL: 'fisico', FOCUS: 'enfoque' };
const PROFILE_FIELD = {
  HEAD: 'equippedHeadSlug',
  FACE: 'equippedFaceSlug',
  BODY: 'equippedBodySlug',
  BACKGROUND: 'equippedBgSlug',
};

// Ropa y fondos del catálogo (los que tienen parte del cuerpo). Las recompensas
// personalizadas nunca son ropa.
const isWardrobeItem = (item) => Boolean(SLOT_ES[item?.slot]) && item.active !== false && !item.custom;

// En MongoDB los documentos sin consumedAt no aparecen con `consumedAt: null`, así que
// se filtra aquí y no en la consulta.
const notConsumed = (entry) => !entry.consumedAt;

// El fondo gratis (precio 0) es de todos sin comprarlo.
const isFreeItem = (item) => (item.price ?? 0) === 0 && item.slot === 'BACKGROUND';

const ownedIds = (entries) => new Set(entries.filter(notConsumed).map((e) => String(e.catalogItemId)));

const isOwned = (item, owned) => owned.has(String(item.id)) || isFreeItem(item);

const isEquipped = (item, profile) => isSameItem(item, profile?.[PROFILE_FIELD[item.slot]]);

// GET /vestidor/articulos
function buildWardrobe({ catalog, entries, profile }) {
  const owned = ownedIds(entries);
  return catalog.filter(isWardrobeItem).map((item) => {
    const equipped = isEquipped(item, profile);
    const mine = isOwned(item, owned);
    let status = `${item.price ?? 100} pts`;
    if (equipped) status = 'Equipado';
    else if (mine) status = 'Tuyo';
    else if (item.unlockNote) status = item.unlockNote;

    return {
      id: itemKey(item),
      name: item.name,
      stat: POINT_ES[item.pointType] ?? 'cultura',
      icon: appIconOf(item),
      status,
      equipped,
      owned: mine,
      category: SLOT_ES[item.slot],
      asset: assetOf(item),
    };
  });
}

// La prenda que pide la app: por su nombre de imagen, su id o su slug.
const findWardrobeItem = (catalog, value) =>
  catalog.filter(isWardrobeItem).find((item) => isSameItem(item, value)) ?? null;

// PATCH /vestidor/articulos/:id → qué cambiar en el perfil y en el inventario.
// Devuelve { error } si no se puede, o { profileData, entryUpdates }.
function planEquip({ catalog, entries, profile, item, equipped }) {
  const owned = ownedIds(entries);
  if (equipped && !isOwned(item, owned)) return { error: 'Esa prenda todavía no es tuya.' };

  const field = PROFILE_FIELD[item.slot];
  // Quitar solo borra la parte si lo que hay puesto es esta prenda.
  const profileData = equipped
    ? { [field]: itemKey(item) }
    : isEquipped(item, profile) ? { [field]: null } : {};

  return { profileData, entryUpdates: syncEntries({ catalog, entries, profile: { ...profile, ...profileData } }) };
}

// El perfil manda: el inventario (M04) marca como puesta exactamente la prenda que el
// perfil tiene en cada parte. Devuelve solo las existencias que hay que cambiar.
function syncEntries({ catalog, entries, profile }) {
  const byId = new Map(catalog.map((c) => [String(c.id), c]));
  return entries.filter(notConsumed).flatMap((entry) => {
    const item = byId.get(String(entry.catalogItemId));
    if (!item) return [];
    const equipped = isEquipped(item, profile);
    return Boolean(entry.equipped) === equipped ? [] : [{ id: entry.id, equipped }];
  });
}

// Texto de cada parte del look (nombre de la prenda; si ya no existe, lo guardado).
function slotNames({ catalog, values, empty = 'Vacío', emptyBackground = 'La Casa' }) {
  const nameOf = (value) => catalog.find((item) => isSameItem(item, value))?.name ?? value;
  return {
    Cabeza: values.head ? nameOf(values.head) : empty,
    Cara: values.face ? nameOf(values.face) : empty,
    Cuerpo: values.body ? nameOf(values.body) : empty,
    Fondo: values.bg ? nameOf(values.bg) : emptyBackground,
  };
}

module.exports = {
  PROFILE_FIELD,
  isWardrobeItem,
  buildWardrobe,
  findWardrobeItem,
  planEquip,
  syncEntries,
  slotNames,
};
