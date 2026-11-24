// Pruebas HTTP del M04 (/api/v1/tienda y /api/v1/inventario) con los repositorios
// Prisma reales sobre el cliente falso: contrato de la app móvil (src/models/Item.ts),
// reglas de puntos y ropa, y errores { error, code }.

const test = require('node:test');
const assert = require('node:assert/strict');

const { encender } = require('../../support/servidorPrueba');
const { createTiendaModule } = require('../../../src/modules/m04-tienda');
const { PrismaTiendaRepository } = require('../../../src/modules/m04-tienda/infrastructure/repositories/PrismaTiendaRepository');
const { crearPrismaFalso, nuevoId } = require('../../support/prismaFalso');

const JUGADOR = nuevoId();
const OTRO = nuevoId();
const db = crearPrismaFalso();

let api;
const call = (method, path, body, userId = JUGADOR) => api.call(method, path, body, userId);

// La economía global del M14 se sustituye por el rango que ya publica la PWA.
const economyService = {
  consultarEconomiaActiva: async () => ({ rewardPrice: { min: 50, max: 800 } }),
};

const catalogo = [
  {
    name: 'Boina de lector',
    group: 'tienda',
    icon: 'book-open',
    slug: 'boina-lector',
    asset: 'boina-lector',
    price: 180,
    pointType: 'CULTURE',
    slot: 'HEAD',
  },
  {
    name: 'Lentes redondos',
    group: 'tienda',
    icon: 'book-open',
    slug: 'lentes-redondos',
    asset: 'lentes-redondos',
    price: 240,
    pointType: 'CULTURE',
    slot: 'FACE',
  },
  {
    name: 'Fondo: bosque místico',
    group: 'tienda',
    icon: 'star',
    slug: 'fondo-bosque-mistico',
    asset: 'fondo-bosque-mistico',
    price: 450,
    pointType: 'FOCUS',
    slot: 'BACKGROUND',
  },
  {
    name: 'Libro nuevo',
    group: 'tienda',
    icon: 'book-open',
    slug: 'libro-nuevo',
    price: 480,
    pointType: 'CULTURE',
  },
  {
    name: 'Mancuernas 5 kg',
    group: 'tienda',
    icon: 'dumbbell',
    slug: 'mancuernas-5-kg',
    price: 2500,
    pointType: 'CULTURE',
  },
  {
    name: 'Poción de HP',
    group: 'tienda',
    icon: 'heart',
    slug: 'pocion-hp',
    price: 120,
    pointType: 'FOCUS',
    consumable: true,
  },
];

let ids = {};

test.before(async () => {
  await db.user.create({ data: { id: JUGADOR, email: 'yess@liferpg.test', displayName: 'Yess', role: 'PLAYER', status: 'ACTIVE' } });
  await db.user.create({ data: { id: OTRO, email: 'otro@liferpg.test', displayName: 'Otro', role: 'PLAYER', status: 'ACTIVE' } });
  await db.playerProfile.create({
    data: {
      userId: JUGADOR,
      alias: 'Yess',
      mascotName: 'Susi',
      mascotColor: '#7C9EFF',
      culturePoints: 2000,
      physicalPoints: 1000,
      focusPoints: 2000,
    },
  });

  for (const item of catalogo) {
    const row = await db.catalogItem.create({ data: { ...item, active: true } });
    ids[item.slug] = row.id;
  }

  const { routers } = createTiendaModule({
    repository: new PrismaTiendaRepository({ db }),
    economyService,
    devUserId: null,
  });
  api = await encender((r) => {
    r.use('/tienda', routers.tienda);
    r.use('/inventario', routers.inventario);
  });
});

test.after(() => api.apagar());

test('sin usuario responde 401', async () => {
  assert.equal((await call('GET', '/tienda/articulos', undefined, null)).status, 401);
  assert.equal((await call('GET', '/inventario', undefined, null)).status, 401);
});

test('4.1 · GET /tienda/articulos trae el asset de fondos y accesorios', async () => {
  const res = await call('GET', '/tienda/articulos');
  assert.equal(res.status, 200);
  const boina = res.body.find((i) => i.id === ids['boina-lector']);
  assert.deepEqual(boina, {
    id: ids['boina-lector'],
    name: 'Boina de lector',
    icon: 'book-open',
    price: 180,
    pointType: 'cultura',
    isCustom: false,
    asset: 'boina-lector',
  });
  // Los artículos sin asset caen al slug/id: la app lo usa como nombre de imagen y,
  // si no existe en itemAssets, muestra el ícono de siempre.
  assert.equal(res.body.find((i) => i.id === ids['libro-nuevo']).asset, 'libro-nuevo');
  assert.equal(res.body.find((i) => i.id === ids['fondo-bosque-mistico']).asset, 'fondo-bosque-mistico');
});

test('4.1 · POST /tienda/compras: sin puntos 400; con puntos descuenta y guarda', async () => {
  const caro = await call('POST', '/tienda/compras', { itemId: ids['mancuernas-5-kg'] });
  assert.deepEqual([caro.status, caro.body.error], [400, 'No tienes puntos suficientes.']);

  const compra = await call('POST', '/tienda/compras', { itemId: ids['boina-lector'] });
  assert.equal(compra.status, 200);
  assert.deepEqual(compra.body.wallet, { cultura: 1820, fisico: 1000, enfoque: 2000 });
  assert.equal(compra.body.reward.name, 'Boina de lector');
  assert.equal(compra.body.reward.asset, 'boina-lector');

  // Ya es suya: no se puede comprar dos veces la misma prenda.
  const repetida = await call('POST', '/tienda/compras', { itemId: ids['boina-lector'] });
  assert.deepEqual([repetida.status, repetida.body.error], [400, 'Ya tienes esta prenda.']);

  assert.equal((await call('POST', '/tienda/compras', {})).status, 400);
  assert.equal((await call('POST', '/tienda/compras', { itemId: 'no-existe' })).status, 404);
});

test('4.1 · GET /tienda/precio-sugerido usa el rango de la economía global', async () => {
  const res = await call('GET', '/tienda/precio-sugerido');
  assert.equal(res.status, 200);
  assert.deepEqual([res.body.allowedMin, res.body.allowedMax], [50, 800]);
  assert.ok(res.body.min >= 50 && res.body.max <= 800);
});

test('4.2 · recompensa personalizada: crear, leer, editar y borrar', async () => {
  const creada = await call('POST', '/tienda/recompensas', {
    icon: 'star',
    name: 'Noche de cine',
    description: 'Con palomitas',
    pointType: 'cultura',
    price: 300,
    consumable: true,
  });
  assert.equal(creada.status, 201);
  assert.deepEqual([creada.body.name, creada.body.isCustom, creada.body.pointType], ['Noche de cine', true, 'cultura']);

  const detalle = await call('GET', `/tienda/recompensas/${creada.body.id}`);
  assert.equal(detalle.status, 200);
  assert.deepEqual(
    [detalle.body.description, detalle.body.consumable, detalle.body.price],
    ['Con palomitas', true, 300],
  );

  const fuera = await call('PUT', `/tienda/recompensas/${creada.body.id}`, {
    icon: 'star',
    name: 'Noche de cine',
    description: 'Con palomitas',
    pointType: 'cultura',
    price: 9000,
    consumable: true,
  });
  assert.equal(fuera.status, 400);

  const editada = await call('PUT', `/tienda/recompensas/${creada.body.id}`, {
    icon: 'star',
    name: 'Cine con amigas',
    description: 'Con palomitas',
    pointType: 'cultura',
    price: 350,
    consumable: true,
  });
  assert.deepEqual([editada.status, editada.body.name, editada.body.price], [200, 'Cine con amigas', 350]);

  // Otro jugador no puede verla ni editarla.
  assert.equal((await call('GET', `/tienda/recompensas/${creada.body.id}`, undefined, OTRO)).status, 404);

  assert.equal((await call('DELETE', `/tienda/recompensas/${creada.body.id}`)).status, 204);
  assert.equal((await call('GET', `/tienda/recompensas/${creada.body.id}`)).status, 404);
});

test('4.3 · inventario: compra un consumible y se usa hasta agotarse', async () => {
  const compra = await call('POST', '/tienda/compras', { itemId: ids['pocion-hp'] });
  assert.equal(compra.status, 200);

  const inventario = await call('GET', '/inventario');
  assert.equal(inventario.status, 200);
  const pocion = inventario.body.consumables.find((c) => c.id === ids['pocion-hp']);
  assert.deepEqual([pocion.name, pocion.quantity], ['Poción de HP', 1]);

  const usar = await call('POST', `/inventario/consumibles/${ids['pocion-hp']}/usar`);
  assert.equal(usar.status, 200);
  assert.equal(usar.body.length, 0);

  // Se registra en el historial de canjes (RDF059).
  const canjes = await call('GET', '/inventario/canjes');
  assert.equal(canjes.status, 200);
  assert.deepEqual([canjes.body[0].name, canjes.body[0].kind], ['Poción de HP', 'consumible']);
});

test('4.3 · PATCH /inventario/ropa/:id equipa una sola prenda por parte', async () => {
  // Compra los lentes y el fondo.
  assert.equal((await call('POST', '/tienda/compras', { itemId: ids['lentes-redondos'] })).status, 200);
  assert.equal((await call('POST', '/tienda/compras', { itemId: ids['fondo-bosque-mistico'] })).status, 200);

  const equipada = await call('PATCH', `/inventario/ropa/${ids['boina-lector']}`);
  assert.equal(equipada.status, 200);
  assert.equal(equipada.body.find((c) => c.id === ids['boina-lector']).equipped, true);

  // El perfil (M01) ve el mismo look que la Tienda.
  const perfil = await db.playerProfile.findUnique({ where: { userId: JUGADOR } });
  assert.equal(perfil.equippedHeadSlug, 'boina-lector');

  // Quitarla vuelve a dejar la parte vacía.
  const quitada = await call('PATCH', `/inventario/ropa/${ids['boina-lector']}`);
  assert.equal(quitada.body.find((c) => c.id === ids['boina-lector']).equipped, false);
  assert.equal((await db.playerProfile.findUnique({ where: { userId: JUGADOR } })).equippedHeadSlug, null);

  // Un fondo también es ropa equipable.
  const fondo = await call('PATCH', `/inventario/ropa/${ids['fondo-bosque-mistico']}`);
  assert.equal(fondo.body.find((c) => c.id === ids['fondo-bosque-mistico']).equipped, true);
  assert.equal((await db.playerProfile.findUnique({ where: { userId: JUGADOR } })).equippedBgSlug, 'fondo-bosque-mistico');
});

test('4.3 · GET /inventario separa recompensas, consumibles y ropa', async () => {
  const res = await call('GET', '/inventario');
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body).sort(), ['clothing', 'consumables', 'rewards']);

  const ropa = res.body.clothing.map((c) => c.asset).sort();
  assert.deepEqual(ropa, ['boina-lector', 'fondo-bosque-mistico', 'lentes-redondos']);
  assert.ok(res.body.clothing.every((c) => typeof c.equipped === 'boolean'));
});
