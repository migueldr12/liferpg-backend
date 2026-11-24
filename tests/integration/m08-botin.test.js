const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Las pruebas no dependen del .env local: dotenv no pisa variables que ya existen
process.env.DEV_USER_ID = '';

const { createApp } = require('../../src/app');
const { createPrismaBotinRepository } = require('../../src/modules/m08-botin/infrastructure/repositories/prismaBotinRepository');
const { crearPrismaFalso, nuevoId } = require('../support/prismaFalso');

// Flujo completo del M08 por HTTP con las rutas que anota la PWA (botinApi.js), el repositorio
// REAL de Prisma sobre el cliente falso (así también se prueba cómo se guarda) y un FCM falso.

const ME = nuevoId();
const ANA = nuevoId();
const DIEGO = nuevoId();
const EVE = nuevoId(); // no es amiga

async function sembrar(db) {
  for (const [id, displayName, alias, species, mascotColor] of [
    [ME, 'Valeria López', 'Valeria', 'DRAGON', 'morado'],
    [ANA, 'Ana Ruiz', 'Ana', 'CAT', 'azul'],
    [DIEGO, 'Diego Paz', 'Diego', 'DOG', '#ff7043'],
    [EVE, 'Eve', 'Eve', 'LION', 'verde'],
  ]) {
    await db.user.create({ data: { id, displayName, email: `${alias.toLowerCase()}@test.mx` } });
    await db.playerProfile.create({ data: { userId: id, alias, species, mascotColor, mascotName: 'x' } });
  }
  await db.friendship.create({ data: { requesterId: ME, addresseeId: ANA, pairKey: `${ME}:${ANA}`, status: 'ACCEPTED' } });
  await db.friendship.create({ data: { requesterId: DIEGO, addresseeId: ME, pairKey: `${DIEGO}:${ME}`, status: 'ACCEPTED' } });
  await db.friendship.create({ data: { requesterId: ME, addresseeId: EVE, pairKey: `${ME}:${EVE}`, status: 'PENDING' } });

  const item = async (name, group, tags, giftable) => (await db.catalogItem.create({ data: { name, group, tags, giftable, icon: `item.${name}` } })).id;
  const ids = {
    pocion: await item('Poción de HP', 'regalables', ['comun'], true),
    boina: await item('Boina de pintor', 'regalables', ['raro'], true),
    carta: await item('Carta sellada', 'regalables', ['carta'], true),
    doblexp: await item('Doble XP · 24 h', 'regalables', ['epico'], true),
    corona: await item('Corona de 100 días', 'exclusivos', ['legendario'], false),
    escudo: await item('Escudo de racha', 'tienda', ['raro'], false),
  };
  const own = (userId, catalogItemId, quantity, equipped = false) => db.inventoryEntry.create({ data: { userId, catalogItemId, quantity, equipped } });
  await own(ME, ids.pocion, 2);
  await own(ME, ids.boina, 1, true);
  await own(ME, ids.carta, 1);
  await own(ME, ids.corona, 1);
  await own(ME, ids.escudo, 1);
  await own(ANA, ids.doblexp, 1);
  await own(ANA, ids.pocion, 1);
  await db.device.create({ data: { userId: ANA, fcmToken: 'tok-ana', platform: 'android', active: true } });
  await db.device.create({ data: { userId: ANA, fcmToken: 'tok-muerto', platform: 'android', active: true } });
  const pide = async (requesterId, ownerId, catalogItemId, message, createdAt) =>
    (await db.giftRequest.create({ data: { requesterId, ownerId, catalogItemId, message, status: 'PENDING', createdAt: new Date(createdAt) } })).id;
  ids.reqPocion = await pide(DIEGO, ME, ids.pocion, 'Mi dragón está débil', '2026-11-24T10:00:00Z');
  ids.reqCorona = await pide(DIEGO, ME, ids.corona, 'Porfa, quiero verla', '2026-11-23T10:00:00Z');
  return ids;
}

describe('M08 · /api/v1/botin', () => {
  let server;
  let base;
  let clock;
  let db;
  let ids;
  let pushes;

  const call = async (method, path, { body, user = ME } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user && { 'x-user-id': user }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
  const qty = (userId, itemId) => db.inventoryEntry.rows.find((e) => e.userId === userId && e.catalogItemId === itemId)?.quantity;
  const gift = (itemId, friendId = ANA, message = 'Para tu racha', user = ME) => call('POST', '/botin/regalos', { body: { friendId, itemId, message }, user });

  beforeEach(async () => {
    clock = new Date('2026-11-24T18:00:00Z');
    db = crearPrismaFalso();
    ids = await sembrar(db);
    pushes = [];
    const pushSender = {
      isConfigured: () => true,
      send: async (tokens, message) => {
        pushes.push({ tokens, ...message });
        return { sent: tokens.filter((t) => t !== 'tok-muerto').length, failed: 0, invalidTokens: tokens.filter((t) => t === 'tok-muerto') };
      },
    };
    const app = createApp({ pingDatabase: async () => ({}), botinRepository: createPrismaBotinRepository({ db }), pushSender, now: () => clock });
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/v1`;
  });

  afterEach(() => server.close());

  test('sin usuario responde 401', async () => {
    assert.equal((await call('GET', '/botin/cofre', { user: null })).status, 401);
  });

  test('amigos: solo amistades aceptadas, con inicial, mascota y color', async () => {
    const res = await call('GET', '/botin/amigos');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [
      { id: ANA, name: 'Ana', avatar: 'A', pet: 'gato', color: '#2f80ed' },
      { id: DIEGO, name: 'Diego', avatar: 'D', pet: 'perro', color: '#ff7043' },
    ]);
  });

  test('RDF088: el cofre trae rareza, cantidad y si cada objeto se puede regalar', async () => {
    const res = await call('GET', '/botin/cofre');
    assert.equal(res.status, 200);
    const by = Object.fromEntries(res.body.map((i) => [i.name, i]));
    assert.deepEqual(by['Poción de HP'], { id: ids.pocion, name: 'Poción de HP', icon: 'item.Poción de HP', rarity: 'comun', qty: 2, equipped: false, exclusive: false, giftable: true });
    assert.deepEqual([by['Boina de pintor'].equipped, by['Boina de pintor'].giftable], [true, false]);
    assert.deepEqual([by['Corona de 100 días'].exclusive, by['Corona de 100 días'].giftable, by['Corona de 100 días'].rarity], [true, false, 'legendario']);
    assert.deepEqual([by['Carta sellada'].qty, by['Carta sellada'].giftable], [-1, true]);
    assert.equal(by['Escudo de racha'].giftable, false);
  });

  test('RDF082 y RDF090: el regalo pasa al inventario del amigo y le llega un aviso', async () => {
    const res = await gift(ids.pocion);
    assert.equal(res.status, 201);
    assert.deepEqual([res.body.to, res.body.item, res.body.notification], ['Ana', 'Poción de HP', 'enviada']);
    assert.equal(res.body.chest.find((i) => i.id === ids.pocion).qty, 1);
    assert.deepEqual([qty(ME, ids.pocion), qty(ANA, ids.pocion)], [1, 2]);
    // Movimientos de inventario y envío entregado
    assert.deepEqual(db.inventoryMovement.rows.map((m) => [m.type, m.userId, m.quantity]), [['GIFT_OUT', ME, 1], ['GIFT_IN', ANA, 1]]);
    assert.deepEqual([db.giftTransfer.rows[0].status, db.giftTransfer.rows[0].message, 'giftRequestId' in db.giftTransfer.rows[0]], ['DELIVERED', 'Para tu racha', false]);
    // Push a Ana con el nombre de quien regala; el token muerto queda desactivado
    assert.deepEqual(pushes, [{ tokens: ['tok-ana', 'tok-muerto'], title: '¡Te llegó un regalo!', body: 'Valeria te envió Poción de HP' }]);
    assert.equal(db.device.rows.find((d) => d.fcmToken === 'tok-muerto').active, false);
  });

  test('RDF082: un objeto nuevo para el amigo se crea en su inventario como regalo', async () => {
    const res = await gift(ids.carta, DIEGO, '');
    assert.equal(res.status, 201);
    assert.equal(res.body.notification, 'sin_dispositivo');
    const entry = db.inventoryEntry.rows.find((e) => e.userId === DIEGO && e.catalogItemId === ids.carta);
    assert.deepEqual([entry.quantity, entry.source], [1, 'GIFT']);
    assert.equal(db.giftTransfer.rows[0].message, null); // mensaje vacío
    // La carta es ilimitada: no se descuenta
    assert.equal((await gift(ids.carta, DIEGO)).status, 201);
    assert.equal(qty(ME, ids.carta), 1);
  });

  test('RDF089: no se regala lo equipado, exclusivo, no regalable, ajeno o agotado', async () => {
    const cases = [
      [ids.boina, 'No puedes regalar un objeto que tienes equipado.'],
      [ids.corona, 'Los objetos exclusivos no se pueden regalar.'],
      [ids.escudo, 'Ese objeto no se puede regalar.'],
      [ids.doblexp, 'Ese objeto no está en tu cofre.'],
    ];
    for (const [itemId, error] of cases) {
      const res = await gift(itemId);
      assert.deepEqual([res.status, res.body.error], [409, error]);
    }
    assert.equal((await gift(ids.pocion)).status, 201);
    assert.equal((await gift(ids.pocion)).status, 201);
    const empty = await gift(ids.pocion);
    assert.deepEqual([empty.status, empty.body.error], [409, 'Ya no te quedan existencias de ese objeto.']);
    assert.equal(qty(ME, ids.pocion), 0);
    assert.ok(!(await call('GET', '/botin/cofre')).body.some((i) => i.id === ids.pocion), 'lo agotado sale del cofre');
  });

  test('solo entre amigos y con datos válidos', async () => {
    assert.equal((await gift(ids.pocion, EVE)).status, 403); // amistad pendiente
    assert.equal((await gift(ids.pocion, ME)).status, 403); // a sí mismo
    assert.equal((await call('POST', '/botin/regalos', { body: { friendId: 'ana', itemId: ids.pocion } })).status, 400);
    const long = await gift(ids.pocion, ANA, 'x'.repeat(141));
    assert.deepEqual([long.status, long.body.error], [400, 'El mensaje admite hasta 140 caracteres.']);
    assert.equal(qty(ME, ids.pocion), 2, 'nada se descontó');
  });

  test('RDF083: cofre de un amigo (solo regalables) y pedirle un objeto', async () => {
    const chest = await call('GET', `/botin/cofre/${ANA}`);
    assert.deepEqual(chest.body.map((i) => [i.name, i.qty, i.rarity]), [['Doble XP · 24 h', 1, 'epico'], ['Poción de HP', 1, 'comun']]);
    assert.equal((await call('GET', `/botin/cofre/${EVE}`)).status, 403);
    assert.equal((await call('GET', '/botin/cofre/no-es-id')).status, 404);

    const res = await call('POST', '/botin/solicitudes', { body: { friendId: ANA, itemId: ids.doblexp, reason: 'Semana de exámenes' } });
    assert.equal(res.status, 201);
    assert.deepEqual(
      { ...res.body, at: undefined },
      { id: res.body.id, to: ANA, itemId: ids.doblexp, at: undefined, status: 'pendiente', person: { id: ANA, name: 'Ana', avatar: 'A', pet: 'gato', color: '#2f80ed' }, item: { id: ids.doblexp, name: 'Doble XP · 24 h', icon: 'item.Doble XP · 24 h', rarity: 'epico' } },
    );
    assert.deepEqual(pushes.map((p) => p.body), ['Valeria te pidió Doble XP · 24 h']);
    const again = await call('POST', '/botin/solicitudes', { body: { friendId: ANA, itemId: ids.doblexp } });
    assert.deepEqual([again.status, again.body.error], [409, 'Ya le pediste ese objeto; espera su respuesta.']);
    const missing = await call('POST', '/botin/solicitudes', { body: { friendId: ANA, itemId: ids.corona } });
    assert.deepEqual([missing.status, missing.body.error], [409, 'Ese objeto ya no está en el cofre de tu amigo.']);
    assert.equal((await call('POST', '/botin/solicitudes', { body: { friendId: EVE, itemId: ids.pocion } })).status, 403);
  });

  test('RDF084: bandeja, mis solicitudes y mi cofre', async () => {
    await call('POST', '/botin/solicitudes', { body: { friendId: ANA, itemId: ids.doblexp } });
    const res = await call('GET', '/botin/solicitudes');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.inbox.map((r) => [r.id, r.from, r.reason, r.status, r.person.name, r.item.name]), [
      [ids.reqPocion, DIEGO, 'Mi dragón está débil', 'pendiente', 'Diego', 'Poción de HP'],
      [ids.reqCorona, DIEGO, 'Porfa, quiero verla', 'pendiente', 'Diego', 'Corona de 100 días'],
    ]);
    assert.deepEqual(res.body.mine.map((r) => [r.to, r.status, r.item.name]), [[ANA, 'pendiente', 'Doble XP · 24 h']]);
    assert.ok(res.body.chest.length > 0);
  });

  test('RDF085: aceptar entrega el objeto; rechazar la cierra; no se responde dos veces', async () => {
    const ok = await call('POST', `/botin/solicitudes/${ids.reqPocion}`, { body: { accept: true } });
    assert.equal(ok.status, 200);
    assert.deepEqual([ok.body.request.status, ok.body.request.person.name], ['aceptada', 'Diego']);
    assert.equal(ok.body.chest.find((i) => i.id === ids.pocion).qty, 1);
    assert.deepEqual([qty(DIEGO, ids.pocion), db.giftTransfer.rows[0].giftRequestId], [1, ids.reqPocion]);
    assert.equal(db.giftRequest.rows.find((r) => r.id === ids.reqPocion).status, 'ACCEPTED');
    const twice = await call('POST', `/botin/solicitudes/${ids.reqPocion}`, { body: { accept: false } });
    assert.deepEqual([twice.status, twice.body.error], [409, 'La solicitud ya fue respondida.']);

    // Aceptar algo que no se puede regalar falla y la solicitud sigue pendiente
    const blocked = await call('POST', `/botin/solicitudes/${ids.reqCorona}`, { body: { accept: true } });
    assert.deepEqual([blocked.status, blocked.body.error], [409, 'Los objetos exclusivos no se pueden regalar.']);
    const no = await call('POST', `/botin/solicitudes/${ids.reqCorona}`, { body: { accept: false } });
    assert.deepEqual([no.status, no.body.request.status], [200, 'rechazada']);

    assert.equal((await call('POST', `/botin/solicitudes/${ids.reqCorona}`, { body: { accept: true }, user: ANA })).status, 404); // no es suya
    assert.equal((await call('POST', `/botin/solicitudes/${ids.reqCorona}`, { body: { accept: 'si' } })).status, 400);
  });

  test('RDF086 y RDF087: historial de enviados y recibidos con filtros', async () => {
    await gift(ids.pocion, ANA, 'Primero');
    clock = new Date('2026-11-24T19:00:00Z');
    await gift(ids.doblexp, ME, 'De vuelta', ANA);
    clock = new Date('2026-11-24T20:00:00Z');
    await gift(ids.carta, DIEGO, 'Para Diego');

    const all = await call('GET', '/botin/historial');
    assert.equal(all.status, 200);
    assert.deepEqual(all.body.map((h) => [h.direction, h.person.name, h.item.name, h.message]), [
      ['enviado', 'Diego', 'Carta sellada', 'Para Diego'],
      ['recibido', 'Ana', 'Doble XP · 24 h', 'De vuelta'],
      ['enviado', 'Ana', 'Poción de HP', 'Primero'],
    ]);
    assert.deepEqual((await call('GET', '/botin/historial?tipo=recibido')).body.map((h) => h.friendId), [ANA]);
    assert.deepEqual((await call('GET', `/botin/historial?amigo=${ANA}`)).body.length, 2);
    assert.deepEqual((await call('GET', '/botin/historial?desde=2026-11-24T18:30:00.000Z')).body.length, 2);
    assert.deepEqual((await call('GET', '/botin/historial', { user: ANA })).body.map((h) => h.direction), ['enviado', 'recibido']);
    for (const q of ['tipo=prestado', 'amigo=ana', 'desde=ayer']) assert.equal((await call('GET', `/botin/historial?${q}`)).status, 400, q);
  });
});
