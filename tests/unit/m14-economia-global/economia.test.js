// Pruebas unitarias del M14: reglas del dominio, publicación versionada, catálogo,
// avisos push (con y sin Firebase) y el cliente de FCM. Sin HTTP ni Atlas.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { EconomyVersion, DEFAULT_ECONOMY } = require('../../../src/modules/m14-economia-global/domain/entities/EconomyVersion');
const { CatalogItem } = require('../../../src/modules/m14-economia-global/domain/entities/CatalogItem');
const { PushCampaign } = require('../../../src/modules/m14-economia-global/domain/entities/PushCampaign');
const { ValidationError, ConflictError, NotFoundError } = require('../../../src/modules/m14-economia-global/domain/errors');
const { createEconomiaModule } = require('../../../src/modules/m14-economia-global');
const { PrismaEconomyRepository } = require('../../../src/modules/m14-economia-global/infrastructure/repositories/PrismaEconomyRepository');
const { PrismaCatalogRepository } = require('../../../src/modules/m14-economia-global/infrastructure/repositories/PrismaCatalogRepository');
const { PrismaPushRepository } = require('../../../src/modules/m14-economia-global/infrastructure/repositories/PrismaPushRepository');
const { createFcmClient } = require('../../../src/shared/infrastructure/push/fcmClient');
const { crearPrismaFalso, nuevoId } = require('../../support/prismaFalso');

const ADMIN = nuevoId();
const ECONOMIA = { base: 95, exponent: 1.55, difficultyPoints: { facil: 10, media: 25, dificil: 50, epica: 100 }, rewardPrice: { min: 50, max: 800 } };
const sinFcm = { isConfigured: () => false, send: async () => assert.fail('no debe enviar sin llaves') };

const nuevoModulo = ({ pushSender = sinFcm, now = () => new Date('2026-11-22T18:00:00Z') } = {}) => {
  const db = crearPrismaFalso();
  const { services } = createEconomiaModule({
    now,
    economyRepository: new PrismaEconomyRepository({ db }),
    catalogRepository: new PrismaCatalogRepository({ db }),
    pushRepository: new PrismaPushRepository({ db }),
    pushSender,
    devUserId: null,
  });
  return { db, services };
};

// ───────── Dominio ─────────

test('RDF135: la fórmula XP(n) = base × n^exponente y sus límites', () => {
  const v = new EconomyVersion({ version: 1, ...ECONOMIA });
  assert.equal(v.xpForLevel(1), 95);
  assert.equal(v.xpForLevel(10), Math.round(95 * 10 ** 1.55));
  assert.equal(v.curve().length, 50);
  assert.throws(() => new EconomyVersion({ ...ECONOMIA, base: 0 }), ValidationError);
  assert.throws(() => new EconomyVersion({ ...ECONOMIA, exponent: 2.6 }), /entre 1.0 y 2.5/);
  assert.throws(() => new EconomyVersion({ ...ECONOMIA, exponent: 0.9 }), ValidationError);
  assert.throws(() => new EconomyVersion({ ...ECONOMIA, difficultyPoints: { ...ECONOMIA.difficultyPoints, epica: 0 } }), ValidationError);
  assert.throws(() => new EconomyVersion({ ...ECONOMIA, rewardPrice: { min: 900, max: 800 } }), ValidationError);
});

test('RDF140: artículo válido; precio entero no negativo; regalables son "giftable"', () => {
  const item = new CatalogItem({ name: '  Cofre raro ', group: 'regalables', icon: '🎁', price: 120, tags: ['Botín', 'Botín'] });
  assert.deepEqual([item.name, item.giftable, item.tags], ['Cofre raro', true, ['Botín']]);
  assert.throws(() => new CatalogItem({ name: 'x', group: 'tienda', icon: '⭐', price: -1 }), ValidationError);
  assert.throws(() => new CatalogItem({ name: 'x', group: 'otro', icon: '⭐', price: 1 }), ValidationError);
});

test('RDF141: título ≤ 50, mensaje ≤ 160 y destino válido; el usuario se normaliza', () => {
  const p = new PushCampaign({ title: 'Hola', message: 'Mensaje', target: { kind: 'usuario', username: ' @Camila ' } });
  assert.deepEqual(p.target, { kind: 'usuario', username: 'Camila' });
  assert.throws(() => new PushCampaign({ title: 'x'.repeat(51), message: 'm', target: { kind: 'todos' } }), /50/);
  assert.throws(() => new PushCampaign({ title: 't', message: 'x'.repeat(161), target: { kind: 'todos' } }), /160/);
  assert.throws(() => new PushCampaign({ title: 't', message: 'm', target: { kind: 'grupo' } }), ValidationError);
});

// ───────── Curva de experiencia ─────────

test('RDF134: sin versiones publicadas responde los valores por defecto (versión 0)', async () => {
  const { services } = nuevoModulo();
  const activa = await services.consultarEconomiaActiva();
  assert.equal(activa.version, 0);
  assert.equal(activa.base, DEFAULT_ECONOMY.base);
  assert.equal(activa.publishedAt, null);
});

test('RDF135/136: publicar crea versiones nuevas sin tocar las anteriores (no retroactivo)', async () => {
  const { db, services } = nuevoModulo();
  const v1 = await services.publicarEconomia(ADMIN, ECONOMIA);
  const v2 = await services.publicarEconomia(ADMIN, { ...ECONOMIA, base: 120 });
  assert.deepEqual([v1.version, v2.version], [1, 2]);
  assert.equal(db.economyVersion.rows.length, 2);
  assert.equal(db.economyVersion.rows[0].base, 95); // la v1 no cambió
  assert.deepEqual(db.economyVersion.rows[0].difficultyPoints, { EASY: 10, MEDIUM: 25, HARD: 50, EPIC: 100 }); // enums del esquema
  assert.equal(db.economyVersion.rows[1].publishedById, ADMIN);
  assert.equal((await services.consultarEconomiaActiva()).base, 120);
  assert.deepEqual((await services.consultarEconomiaActiva()).difficultyPoints, ECONOMIA.difficultyPoints);
});

// ───────── Catálogo ─────────

test('RDF137/138: categorías únicas por tipo, no se borran ni cambian de tipo si están en uso', async () => {
  const { db, services } = nuevoModulo();
  const lectura = await services.agregarCategoria({ name: 'Lectura', type: 'habitos', icon: '📖' });
  assert.equal(db.catalogCategory.rows[0].type, 'HABIT');
  await assert.rejects(services.agregarCategoria({ name: ' lectura ', type: 'habitos', icon: '📖' }), ConflictError);
  await services.agregarCategoria({ name: 'Lectura', type: 'misiones', icon: '📖' }); // otro tipo: sí se puede

  await db.habit.create({ data: { userId: nuevoId(), categoryId: lectura.id, name: 'Leer', area: 'CULTURE' } });
  const [enUso] = (await services.consultarCategorias()).filter((c) => c.id === lectura.id);
  assert.equal(enUso.inUse, 1);
  await assert.rejects(services.eliminarCategoria(lectura.id), /está en uso \(1\); no se puede eliminar/);
  await assert.rejects(services.actualizarCategoria(lectura.id, { name: 'Lectura', type: 'tienda', icon: '📖' }), /cambiar de tipo/);

  const renombrada = await services.actualizarCategoria(lectura.id, { name: 'Libros', type: 'habitos', icon: '📚' });
  assert.deepEqual([renombrada.name, renombrada.icon, renombrada.inUse], ['Libros', '📚', 1]);

  const vacia = await services.agregarCategoria({ name: 'Otoño', type: 'tienda', icon: '🍂' });
  await services.eliminarCategoria(vacia.id);
  await assert.rejects(services.eliminarCategoria(vacia.id), NotFoundError);
});

test('RDF140: alta, edición y desactivación de artículos; no lista recompensas personalizadas', async () => {
  const { db, services } = nuevoModulo();
  await db.catalogItem.create({ data: { name: 'Premio de Ana', group: 'tienda', icon: '🍦', price: 30, custom: true, ownerId: nuevoId(), active: true, tags: [] } });
  const cofre = await services.agregarArticulo({ name: 'Cofre raro', group: 'regalables', icon: '🎁', price: 120, tag: 'Botín' });
  assert.deepEqual(cofre.tags, ['Botín']);
  assert.equal(db.catalogItem.rows[1].giftable, true);
  assert.equal(db.catalogItem.rows[1].custom, false);

  const apagado = await services.actualizarArticulo(cofre.id, { active: false });
  assert.equal(apagado.active, false);
  const editado = await services.actualizarArticulo(cofre.id, { price: 150 });
  assert.deepEqual([editado.price, editado.active, editado.name], [150, false, 'Cofre raro']);

  assert.deepEqual((await services.consultarArticulos()).map((i) => i.name), ['Cofre raro']);
  await assert.rejects(services.actualizarArticulo('no-existe', { active: true }), NotFoundError);
});

// ───────── Avisos push ─────────

const conJugadores = async (db) => {
  const camila = nuevoId();
  await db.user.create({ data: { email: 'c@x.mx', role: 'PLAYER', status: 'ACTIVE' } });
  await db.user.create({ data: { email: 'v@x.mx', role: 'PLAYER', status: 'ACTIVE' } });
  await db.user.create({ data: { email: 'a@x.mx', role: 'ADMIN', status: 'ACTIVE' } });
  await db.user.create({ data: { email: 'd@x.mx', role: 'PLAYER', status: 'DISABLED' } });
  await db.playerProfile.create({ data: { userId: camila, alias: 'Camila' } });
  await db.device.create({ data: { userId: camila, fcmToken: 'tok-camila', active: true } });
  await db.device.create({ data: { userId: nuevoId(), fcmToken: 'tok-viejo', active: true } });
  return { camila };
};

test('RDF141 sin llaves de Firebase: se guarda "en_cola" con sus destinatarios', async () => {
  const { db, services } = nuevoModulo();
  await conJugadores(db);
  assert.deepEqual(await services.consultarAudiencia(), { total: 2 }); // solo jugadores activos
  const aviso = await services.enviarNotificacionPush(ADMIN, { title: 'Hola', message: 'Bienvenidos', target: { kind: 'todos' } });
  assert.deepEqual([aviso.status, aviso.recipients, aviso.deliveredPct], ['en_cola', 2, null]);
  assert.equal(db.pushCampaign.rows[0].status, 'QUEUED');
  assert.equal(db.pushCampaign.rows[0].sentAt, null);
});

test('RDF141 con Firebase: envía a los dispositivos, desactiva tokens muertos y evita duplicados en 24 h', async () => {
  const enviados = [];
  const fcm = {
    isConfigured: () => true,
    send: async (tokens, msg) => {
      enviados.push({ tokens, msg });
      return { sent: 1, failed: tokens.length - 1, invalidTokens: tokens.filter((t) => t === 'tok-viejo') };
    },
  };
  let ahora = new Date('2026-11-22T18:00:00Z');
  const { db, services } = nuevoModulo({ pushSender: fcm, now: () => ahora });
  const { camila } = await conJugadores(db);

  const todos = await services.enviarNotificacionPush(ADMIN, { title: 'Mantenimiento', message: 'Sábado 22:00', target: { kind: 'todos' } });
  assert.deepEqual([todos.status, todos.deliveredPct], ['entregado', 50]);
  assert.deepEqual(enviados[0].tokens.sort(), ['tok-camila', 'tok-viejo']);
  assert.equal(db.device.rows.find((d) => d.fcmToken === 'tok-viejo').active, false);

  await assert.rejects(
    services.enviarNotificacionPush(ADMIN, { title: 'MANTENIMIENTO', message: 'otra vez', target: { kind: 'todos' } }),
    /últimas 24 h/,
  );

  const una = await services.enviarNotificacionPush(ADMIN, { title: 'Te extrañamos', message: 'Tu dragón te espera', target: { kind: 'usuario', username: '@camila' } });
  assert.deepEqual([una.recipients, una.target.username], [1, 'Camila']);
  assert.deepEqual(enviados[1].tokens, ['tok-camila']);
  assert.equal(db.pushCampaign.rows[1].targetUserId, camila);
  await assert.rejects(services.enviarNotificacionPush(ADMIN, { title: 'x', message: 'y', target: { kind: 'usuario', username: 'nadie' } }), /No existe el usuario @nadie/);

  ahora = new Date('2026-11-23T19:00:00Z'); // 25 h después ya se puede repetir
  assert.equal((await services.enviarNotificacionPush(ADMIN, { title: 'Mantenimiento', message: 'Sábado', target: { kind: 'todos' } })).status, 'entregado');

  const historial = await services.consultarHistorialEnvios();
  assert.deepEqual(historial.map((p) => p.title), ['Mantenimiento', 'Te extrañamos', 'Mantenimiento']);
  assert.equal(historial[1].target.username, 'Camila');
});

test('cliente FCM: firma el token de acceso, envía a cada dispositivo y reporta los tokens muertos', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n'); // como viene en el .env
  const llamadas = [];
  const fetchImpl = async (url, init) => {
    llamadas.push({ url, init });
    if (url.includes('oauth2')) {
      const assertion = new URLSearchParams(init.body).get('assertion');
      const [h, c, s] = assertion.split('.');
      assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(s, 'base64url')));
      return { ok: true, json: async () => ({ access_token: 'acceso' }) };
    }
    const { message } = JSON.parse(init.body);
    return { ok: message.token !== 'muerto', status: message.token === 'muerto' ? 404 : 200 };
  };
  const fcm = createFcmClient({ projectId: 'liferpg', clientEmail: 'sa@liferpg.iam', privateKey: pem, fetchImpl });
  assert.equal(fcm.isConfigured(), true);
  const r = await fcm.send(['a', 'b', 'muerto'], { title: 'T', body: 'B' });
  assert.deepEqual(r, { sent: 2, failed: 1, invalidTokens: ['muerto'] });
  const envio = llamadas.find((l) => l.url.includes('fcm.googleapis.com'));
  assert.equal(envio.url, 'https://fcm.googleapis.com/v1/projects/liferpg/messages:send');
  assert.equal(envio.init.headers.Authorization, 'Bearer acceso');
  assert.equal(createFcmClient({ projectId: '', clientEmail: '', privateKey: '' }).isConfigured(), false);
});
