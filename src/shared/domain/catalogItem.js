// Reglas compartidas de los artículos del catálogo (M14) tal como los ve la app móvil.
// Las usan la Tienda (M04), el Vestidor y la Casa (M01) para que una prenda se llame
// igual en todos lados.

// Nombre de la imagen en assets/vestidor de la app ("boina-lector", "fondo-bosque-mistico").
// Orden: asset explícito → slug → ícono de la PWA ("item.bufanda-roja" → "bufanda-roja").
const assetOf = (item) => {
  if (item?.asset) return item.asset;
  if (item?.slug) return item.slug;
  const icon = item?.icon;
  return typeof icon === 'string' && icon.startsWith('item.') ? icon.slice(5) : null;
};

// Clave única de una prenda: su asset o slug del catálogo o, si no tiene, su id. Es lo que
// se guarda en playerProfile.equipped*Slug y el `id` que usa el Vestidor de la app.
// El nombre sacado del ícono NO sirve de clave: dos artículos pueden compartir imagen
// (p. ej. dos "Bufanda roja") y la clave tiene que distinguirlos.
const itemKey = (item) => item.asset || item.slug || String(item.id);

// ¿Ese valor guardado (en el perfil o en un look) es esta prenda? Acepta también los
// valores viejos que se guardaban como id o slug.
const isSameItem = (item, value) =>
  value != null && value !== '' && (value === itemKey(item) || value === String(item.id) || value === item.slug);

// Íconos que dibuja la app móvil (PixelIcon en src/components/ui/PixelIcons.tsx).
const APP_ICONS = new Set([
  'home', 'check', 'flag', 'shop', 'trophy', 'book-open', 'dumbbell', 'focus', 'add', 'star',
  'streak', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'chevron-left', 'chevron-right',
  'chevron-up', 'chevron-down', 'close', 'menu', 'search', 'settings', 'user', 'bell', 'heart',
  'lock', 'trash', 'edit', 'minus', 'more', 'info', 'calendar', 'moon', 'clothes', 'bag',
]);

// El catálogo guarda los íconos de la PWA ("item.pocion-hp"). La app solo conoce los
// suyos, así que se elige el más parecido por palabra clave.
const ICON_BY_KEYWORD = [
  [/pocion|vida|hp\b/i, 'heart'],
  [/libro|lector|lectura/i, 'book-open'],
  [/racha/i, 'streak'],
  [/escudo/i, 'lock'],
  [/xp|estrella/i, 'star'],
  [/pesa|mancuerna|deporte/i, 'dumbbell'],
];

const appIconOf = (item) => {
  const icon = item?.icon;
  if (APP_ICONS.has(icon)) return icon;
  // Ropa y fondos: la app pinta encima la imagen del vestidor (asset) si la tiene.
  if (item?.slot) return 'clothes';
  const text = `${icon ?? ''} ${item?.name ?? ''}`;
  const match = ICON_BY_KEYWORD.find(([pattern]) => pattern.test(text));
  return match ? match[1] : 'star';
};

module.exports = { assetOf, itemKey, isSameItem, appIconOf, APP_ICONS };
