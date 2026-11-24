// Datos de prueba del M04 (Tienda e inventario) para la base real.
//
//   pnpm db:seed-m04
//
// - Crea (o actualiza) los artículos del catálogo cuyo `slug`/`asset` es el nombre de
//   su imagen en la app: assets/vestidor/{accesorios,fondos}/<slug>.png.
// - Da al usuario de prueba (dev.yess@liferpg.test) la ropa y el fondo iniciales, unos
//   consumibles y puntos, para que el escaparate, el inventario y el vestidor tengan qué
//   mostrar en las pruebas de la API.
//
// Es repetible: puede ejecutarse varias veces sin duplicar nada. Escribe en la base
// configurada en DATABASE_URL: úsalo solo en desarrollo.

const { getPrisma, disconnect } = require('../src/shared/infrastructure/database/prisma');

const TEST_EMAIL = 'dev.yess@liferpg.test';
const GROUP = 'tienda';

// id fijo de los artículos (repetible). Los primeros 20 dígitos son la fecha base.
const oid = (n) => `65000000000000000004${String(n).padStart(4, '0')}`;

const SLOT = { HEAD: 'HEAD', FACE: 'FACE', BODY: 'BODY', BACKGROUND: 'BACKGROUND' };
const POINT = { cultura: 'CULTURE', fisico: 'PHYSICAL', enfoque: 'FOCUS' };

// El `slug` es el nombre de la imagen (src/constants/itemAssets.ts del móvil).
const CATALOG = [
  { slug: 'boina-lector', name: 'Boina de lector', icon: 'book-open', slot: SLOT.HEAD, point: 'cultura', price: 180 },
  { slug: 'gorro-lana', name: 'Gorro de lana', icon: 'focus', slot: SLOT.HEAD, point: 'enfoque', price: 220 },
  { slug: 'banda-deportiva', name: 'Banda deportiva', icon: 'dumbbell', slot: SLOT.HEAD, point: 'fisico', price: 200 },
  { slug: 'gorra-corredor', name: 'Gorra de corredor', icon: 'dumbbell', slot: SLOT.HEAD, point: 'fisico', price: 260 },
  { slug: 'capucha-monje', name: 'Capucha de monje', icon: 'focus', slot: SLOT.HEAD, point: 'enfoque', price: 300 },
  { slug: 'corona-sabio', name: 'Corona del sabio', icon: 'star', slot: SLOT.HEAD, point: 'cultura', price: 500 },
  { slug: 'lentes-sol', name: 'Lentes de sol', icon: 'star', slot: SLOT.FACE, point: 'fisico', price: 240 },
  { slug: 'lentes-redondos', name: 'Lentes redondos', icon: 'book-open', slot: SLOT.FACE, point: 'cultura', price: 240 },
  { slug: 'bufanda-roja', name: 'Bufanda roja', icon: 'clothes', slot: SLOT.BODY, point: 'cultura', price: 280 },
  { slug: 'sudadera', name: 'Sudadera', icon: 'clothes', slot: SLOT.BODY, point: 'fisico', price: 320 },
  { slug: 'fondo-casa', name: 'Fondo: casa', icon: 'home', slot: SLOT.BACKGROUND, point: 'cultura', price: 0 },
  {
    slug: 'fondo-bosque-mistico',
    name: 'Fondo: bosque místico',
    icon: 'star',
    slot: SLOT.BACKGROUND,
    point: 'enfoque',
    price: 450,
  },
];

// Prendas que ya son del usuario de prueba (id del artículo → equipada).
const OWNED = {
  'boina-lector': true,
  'gorro-lana': false,
  'banda-deportiva': false,
  'lentes-redondos': true,
  'bufanda-roja': false,
  'fondo-casa': true,
  'fondo-bosque-mistico': false,
};

async function upsertCatalogItem(db, item, index) {
  const data = {
    name: item.name,
    description: item.description ?? null,
    group: GROUP,
    icon: item.icon,
    slug: item.slug,
    // El backend no guarda imágenes: solo el nombre de la que trae la app.
    asset: item.slug,
    price: item.price,
    pointType: POINT[item.point],
    slot: item.slot,
    consumable: false,
    giftable: false,
    custom: false,
    active: true,
  };

  const current = await db.catalogItem.findFirst({ where: { slug: item.slug, custom: false } });
  if (current) {
    return db.catalogItem.update({ where: { id: current.id }, data });
  }
  return db.catalogItem.create({ data: { id: oid(index + 1), ...data } });
}

async function grant(db, userId, itemId, { equipped = false, source = 'PURCHASE' } = {}) {
  const existing = await db.inventoryEntry.findFirst({ where: { userId, catalogItemId: itemId } });
  if (existing) {
    return db.inventoryEntry.update({
      where: { id: existing.id },
      data: { equipped, consumedAt: null, quantity: 1 },
    });
  }
  return db.inventoryEntry.create({
    data: { userId, catalogItemId: itemId, quantity: 1, equipped, source },
  });
}

async function main() {
  const db = getPrisma();

  // 1) Catálogo
  const bySlug = {};
  for (const [index, item] of CATALOG.entries()) {
    bySlug[item.slug] = await upsertCatalogItem(db, item, index);
  }
  console.log(`Catálogo M04: ${CATALOG.length} artículos (slug = nombre de la imagen).`);

  // 2) Usuario de prueba
  const user = await db.user.findUnique({ where: { email: TEST_EMAIL } });
  if (!user) {
    console.warn(`No existe ${TEST_EMAIL}. Crea el usuario de prueba y vuelve a ejecutar.`);
    return;
  }

  const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });

  // 3) Ropa y fondos del jugador
  for (const [slug, equipped] of Object.entries(OWNED)) {
    await grant(db, user.id, bySlug[slug].id, { equipped, source: 'REWARD' });
  }

  // 4) Recompensa y consumibles propios, para las secciones del inventario
  const extras = [
    {
      slug: 'recompensa-noche-de-cine',
      name: 'Noche de cine',
      icon: 'star',
      point: 'cultura',
      price: 300,
      consumable: false,
      owned: true,
    },
    {
      slug: 'consumible-pocion-hp',
      name: 'Poción de HP',
      icon: 'heart',
      point: 'enfoque',
      price: 120,
      consumable: true,
      owned: true,
      quantity: 2,
    },
  ];

  for (const extra of extras) {
    let item = await db.catalogItem.findFirst({ where: { slug: extra.slug, ownerId: user.id } });
    const data = {
      ownerId: user.id,
      custom: true,
      active: true,
      group: GROUP,
      giftable: false,
      tags: [],
      name: extra.name,
      description: null,
      icon: extra.icon,
      slug: extra.slug,
      asset: null,
      price: extra.price,
      pointType: POINT[extra.point],
      slot: null,
      consumable: extra.consumable,
    };
    item = item
      ? await db.catalogItem.update({ where: { id: item.id }, data })
      : await db.catalogItem.create({ data });

    if (extra.owned) {
      await grant(db, user.id, item.id, { source: 'REWARD' });
      if (extra.quantity) {
        await db.inventoryEntry.update({ where: { userId_catalogItemId: { userId: user.id, catalogItemId: item.id } }, data: { quantity: extra.quantity } });
      }
    }
  }

  // 5) Perfil: look inicial y puntos para probar compras
  if (profile) {
    await db.playerProfile.update({
      where: { userId: user.id },
      data: {
        equippedHeadSlug: 'boina-lector',
        equippedFaceSlug: 'lentes-redondos',
        equippedBodySlug: null,
        equippedBgSlug: 'fondo-casa',
        culturePoints: Math.max(profile.culturePoints ?? 0, 1200),
        physicalPoints: Math.max(profile.physicalPoints ?? 0, 1200),
        focusPoints: Math.max(profile.focusPoints ?? 0, 1200),
      },
    });
  } else {
    console.warn(`El usuario ${TEST_EMAIL} no tiene perfil de jugador; no se ajustó el look.`);
  }

  console.log(`Listo: ${TEST_EMAIL} ya tiene ropa, fondo, recompensa y consumibles de prueba.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnect);
