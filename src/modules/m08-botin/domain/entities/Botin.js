// Reglas del Botín (M08): qué objetos se pueden regalar y cómo se ven en la PWA. Todo es puro.
//
// Entrada del cofre: { itemId, qty, equipped, item }
// Artículo:          { id, name, icon, tags, group, giftable, active }   (catálogo del M14)
// - La rareza sale de las etiquetas del artículo; sin etiqueta es "comun".
// - Los artículos con la etiqueta "carta" son ilimitados: se regalan sin descontar existencias.
// - Un artículo se puede regalar si el catálogo lo marca como regalable (grupo "regalables" del M14).

const RARITIES = ['comun', 'raro', 'epico', 'legendario', 'carta'];
const DIRECTIONS = ['enviado', 'recibido'];
const MESSAGE_MAX = 140;
const UNLIMITED = -1;

const rarityOf = (tags = []) => RARITIES.find((r) => tags.includes(r)) ?? 'comun';
const isUnlimited = (item) => (item?.tags ?? []).includes('carta');
const isExclusive = (item) => item?.group === 'exclusivos';

// RDF089 · validarItemRegalable: el motivo por el que NO se puede regalar, o null si sí se puede
function giftBlockReason(entry) {
  if (!entry || !entry.item) return 'Ese objeto no está en tu cofre.';
  if (entry.equipped) return 'No puedes regalar un objeto que tienes equipado.';
  if (isExclusive(entry.item)) return 'Los objetos exclusivos no se pueden regalar.';
  if (!entry.item.giftable || !entry.item.active) return 'Ese objeto no se puede regalar.';
  if (!isUnlimited(entry.item) && entry.qty <= 0) return 'Ya no te quedan existencias de ese objeto.';
  return null;
}

const itemView = (item) => (item ? { id: item.id, name: item.name, icon: item.icon, rarity: rarityOf(item.tags) } : null);

// RDF088 · un objeto del cofre: cantidad (-1 = ilimitado) y si se puede regalar
const chestView = (entry) => ({
  ...itemView(entry.item),
  qty: isUnlimited(entry.item) ? UNLIMITED : entry.qty,
  equipped: Boolean(entry.equipped),
  exclusive: isExclusive(entry.item),
  giftable: giftBlockReason(entry) === null,
});

// Lo que se ve del cofre de un amigo: solo sus objetos regalables
const friendChestView = (entry) => ({ ...itemView(entry.item), qty: isUnlimited(entry.item) ? UNLIMITED : entry.qty });

// Persona pública: { id, name, avatar, pet, color }
const personView = (p) => (p ? { id: p.id, name: p.name, avatar: p.avatar, pet: p.pet, color: p.color } : null);

const sortByName = (rows) => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es'));
const newestFirst = (key) => (a, b) => new Date(b[key]) - new Date(a[key]);

module.exports = {
  RARITIES,
  DIRECTIONS,
  MESSAGE_MAX,
  UNLIMITED,
  rarityOf,
  isUnlimited,
  giftBlockReason,
  itemView,
  chestView,
  friendChestView,
  personView,
  sortByName,
  newestFirst,
};
