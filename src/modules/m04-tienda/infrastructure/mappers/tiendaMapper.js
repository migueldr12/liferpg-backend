// Conversión entre los documentos de MongoDB y los datos que consume la app móvil
// (M04 · Tienda e inventario). En la base los enums van en inglés; en la API van en
// español y camelCase, igual que src/models/Item.ts del móvil.

const POINT_FROM_DB = { CULTURE: 'cultura', PHYSICAL: 'fisico', FOCUS: 'enfoque' };
const POINT_TO_DB = { cultura: 'CULTURE', fisico: 'PHYSICAL', enfoque: 'FOCUS' };
const SLOT_FROM_DB = { HEAD: 'Cabeza', FACE: 'Cara', BODY: 'Cuerpo', BACKGROUND: 'Fondo' };

// Tipo de puntos que se usa cuando el artículo del catálogo no trae uno: la app lo
// muestra así en la etiqueta del precio y la compra cobra con el mismo.
const DEFAULT_POINT_TYPE = 'CULTURE';

const pointTypeFromDb = (value) => POINT_FROM_DB[value] ?? POINT_FROM_DB[DEFAULT_POINT_TYPE];
const pointTypeToDb = (value) => POINT_TO_DB[value] ?? null;
const slotFromDb = (value) => SLOT_FROM_DB[value] ?? null;

// Un artículo es consumible si el catálogo lo marca así o si viene de una versión
// anterior que solo guardaba la etiqueta.
const isConsumableItem = (item) =>
  Boolean(item?.consumable) || (item?.tags ?? []).some((tag) => /consumible/i.test(tag));

const isClothingItem = (item) => Boolean(item?.slot);

// Íconos que dibuja la app móvil (PixelIcon en src/components/ui/PixelIcons.tsx).
const APP_ICONS = new Set([
  'home', 'check', 'flag', 'shop', 'trophy', 'book-open', 'dumbbell', 'focus', 'add', 'star',
  'streak', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'chevron-left', 'chevron-right',
  'chevron-up', 'chevron-down', 'close', 'menu', 'search', 'settings', 'user', 'bell', 'heart',
  'lock', 'trash', 'edit', 'minus', 'more', 'info', 'calendar', 'moon', 'clothes', 'bag',
]);

// El catálogo del M14 guarda los íconos de la PWA ("item.pocion-hp"). La app solo
// conoce los suyos, así que se elige el más parecido por palabra clave.
const ICON_BY_KEYWORD = [
  [/pocion|vida|hp\b/i, 'heart'],
  [/libro|lector|lectura/i, 'book-open'],
  [/racha/i, 'streak'],
  [/escudo/i, 'lock'],
  [/xp|estrella/i, 'star'],
  [/pesa|mancuerna|deporte/i, 'dumbbell'],
];

const iconOf = (item) => {
  const icon = item?.icon;
  if (APP_ICONS.has(icon)) return icon;
  // Ropa y fondos: la app pinta encima la imagen del vestidor (asset) si la tiene.
  if (item?.slot) return 'clothes';
  const text = `${icon ?? ''} ${item?.name ?? ''}`;
  const match = ICON_BY_KEYWORD.find(([pattern]) => pattern.test(text));
  return match ? match[1] : 'star';
};

// Nombre de la imagen en assets/vestidor del móvil. Si el catálogo no trae asset ni
// slug, se toma del ícono de la PWA ("item.bufanda-roja" → "bufanda-roja").
const assetOf = (item) =>
  item?.asset ?? item?.slug ?? (item?.icon?.startsWith('item.') ? item.icon.slice(5) : null);

// GET /tienda/articulos
const toShopItemDto = (item) => ({
  id: item.id,
  name: item.name,
  icon: iconOf(item),
  price: item.price ?? 0,
  pointType: pointTypeFromDb(item.pointType),
  isCustom: Boolean(item.custom),
  // Nombre de la imagen en assets/vestidor; null = la app usa el id y, si tampoco
  // existe, muestra el ícono de siempre.
  asset: assetOf(item),
});

// GET /tienda/recompensas/:id (para editarla)
const toCustomRewardDto = (item) => ({
  id: item.id,
  icon: iconOf(item),
  name: item.name,
  description: item.description ?? '',
  pointType: pointTypeFromDb(item.pointType),
  price: item.price ?? 0,
  consumable: isConsumableItem(item),
});

// GET /inventario · recompensas
const toOwnedRewardDto = (item, entry) => ({
  id: item.id,
  name: item.name,
  icon: iconOf(item),
  giftFrom: null,
  subtitle: entry?.source === 'GIFT' ? 'Recibida como regalo · lista para canjear' : 'Comprada · lista para canjear',
});

// GET /inventario · consumibles
const toConsumableDto = (item, entry) => ({
  id: item.id,
  name: item.name,
  icon: iconOf(item),
  giftFrom: null,
  quantity: entry?.quantity ?? 1,
});

// GET /inventario · ropa (incluye fondos)
const toClothingDto = (item, entry) => ({
  id: item.id,
  name: item.name,
  icon: iconOf(item),
  giftFrom: null,
  equipped: Boolean(entry?.equipped),
  asset: assetOf(item),
});

// GET /inventario/canjes
const toRedemptionDto = (movement, item) => ({
  id: movement.id,
  name: item.name,
  icon: iconOf(item),
  kind: isConsumableItem(item) ? 'consumible' : 'recompensa',
  redeemedAt: new Date(movement.createdAt).toISOString(),
});

module.exports = {
  DEFAULT_POINT_TYPE,
  POINT_FROM_DB,
  POINT_TO_DB,
  SLOT_FROM_DB,
  pointTypeFromDb,
  pointTypeToDb,
  slotFromDb,
  assetOf,
  isConsumableItem,
  isClothingItem,
  toShopItemDto,
  toCustomRewardDto,
  toOwnedRewardDto,
  toConsumableDto,
  toClothingDto,
  toRedemptionDto,
};
