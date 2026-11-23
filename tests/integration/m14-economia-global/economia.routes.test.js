// Pruebas HTTP del M14 (/api/v1/economia, /catalogo y /push) con los repositorios
// Prisma reales sobre el cliente falso: contrato de la PWA (economiaApi.js), permisos
// de administrador y errores { error, code }.

const test = require('node:test');
const assert = require('node:assert/strict');

const { encender } = require('../../support/servidorPrueba');
const { createEconomiaModule } = require('../../../src/modules/m14-economia-global');
const { PrismaEconomyRepository } = require('../../../src/modules/m14-economia-global/infrastructure/repositories/PrismaEconomyRepository');
const { PrismaCatalogRepository } = require('../../../src/modules/m14-economia-global/infrastructure/repositories/PrismaCatalogRepository');
const { PrismaPushRepository } = require('../../../src/modules/m14-economia-global/infrastructure/repositories/PrismaPushRepository');
const { crearPrismaFalso, nuevoId } = require('../../support/prismaFalso');

const ADMIN = nuevoId();
const JUGADOR = nuevoId();
const db = crearPrismaFalso();
let api;
const call = (method, path, body, userId = ADMIN) => api.call(method, path, body, userId);

test.before(async () => {
  const roles = { [ADMIN]: 'ADMIN', [JUGADOR]: 'PLAYER' };
  const { routers } = createEconomiaModule({
    now: () => new Date('2026-11-22T18:00:00Z'),
    economyRepository: new PrismaEconomyRepository({ db }),
    catalogRepository: new PrismaCatalogRepository({ db }),
    pushRepository: new PrismaPushRepository({ db }),
    pushSender: { isConfigured: () => false },
    findRole: async (id) => roles[id] ?? null,
    devUserId: null,
  });
  api = await encender((r) => {
    r.use('/economia', routers.economia);
    r.use('/catalogo', routers.catalogo);
    r.use('/push', routers.push);
  });
});

test.after(() => api.apagar());

test('sin usuario 401, un jugador 403: todo el M14 es solo para administradores', async () => {
  for (const path of ['/economia/curva', '/catalogo/categorias', '/catalogo/articulos', '/push/historial', '/push/audiencia']) {
    assert.equal((await call('GET', path, undefined, null)).status, 401, path);
    const r = await call('GET', path, undefined, JUGADOR);
    assert.deepEqual([r.status, r.body.code], [403, 'FORBIDDEN'], path);
  }
});

test('14.1 · GET /economia/curva y POST /economia/versiones (versión nueva, 201)', async () => {
  const actual = await call('GET', '/economia/curva');
  assert.equal(actual.status, 200);
  assert.deepEqual(Object.keys(actual.body).sort(), ['base', 'curve', 'difficultyPoints', 'exponent', 'publishedAt', 'rewardPrice', 'version']);
  assert.equal(actual.body.version, 0);
  assert.equal(actual.body.curve.length, 50);

  const draft = { base: 95, exponent: 1.55, difficultyPoints: { facil: 10, media: 25, dificil: 50, epica: 100 }, rewardPrice: { min: 50, max: 800 } };
  const v1 = await call('POST', '/economia/versiones', draft);
  assert.deepEqual([v1.status, v1.body.version, v1.body.publishedAt], [201, 1, '2026-11-22T18:00:00.000Z']);
  assert.deepEqual(v1.body.curve[9], { level: 10, xp: Math.round(95 * 10 ** 1.55) });
  assert.equal((await call('GET', '/economia/curva')).body.version, 1);

  const malo = await call('POST', '/economia/versiones', { ...draft, exponent: 3 });
  assert.deepEqual([malo.status, malo.body.code], [400, 'VALIDATION_ERROR']);
  assert.match(malo.body.error, /exponente/);
  assert.equal((await call('POST', '/economia/versiones', { base: 'x' })).status, 400);
});

test('14.2 · categorías: crear 201, duplicado 409, editar, borrar 204, en uso 409', async () => {
  const creada = await call('POST', '/catalogo/categorias', { name: 'Lectura', type: 'habitos', icon: '📖' });
  assert.equal(creada.status, 201);
  assert.deepEqual(Object.keys(creada.body).sort(), ['icon', 'id', 'inUse', 'name', 'type']);
  assert.equal(creada.body.inUse, 0);

  const repetida = await call('POST', '/catalogo/categorias', { name: 'LECTURA', type: 'habitos', icon: '📖' });
  assert.deepEqual([repetida.status, repetida.body.error], [409, 'Ya existe una categoría con ese nombre.']);
  assert.equal((await call('POST', '/catalogo/categorias', { name: 'X', type: 'otro', icon: '⭐' })).status, 400);

  const editada = await call('PUT', `/catalogo/categorias/${creada.body.id}`, { name: 'Libros', type: 'habitos', icon: '📚' });
  assert.deepEqual([editada.status, editada.body.name], [200, 'Libros']);

  await db.mission.create({ data: { userId: nuevoId(), categoryId: creada.body.id, title: 'Leer', area: 'CULTURE' } });
  const enUso = await call('DELETE', `/catalogo/categorias/${creada.body.id}`);
  assert.deepEqual([enUso.status, enUso.body.code], [409, 'CONFLICT']);

  const otra = await call('POST', '/catalogo/categorias', { name: 'Otoño', type: 'tienda', icon: '🍂' });
  assert.equal((await call('DELETE', `/catalogo/categorias/${otra.body.id}`)).status, 204);
  assert.equal((await call('DELETE', `/catalogo/categorias/${otra.body.id}`)).status, 404);
  assert.deepEqual((await call('GET', '/catalogo/categorias')).body.map((c) => [c.name, c.inUse]), [['Libros', 1]]);
});

test('14.2 · artículos: alta 201, activar/desactivar con PATCH, 404 si no existe', async () => {
  const alta = await call('POST', '/catalogo/articulos', { name: 'Bufanda roja', group: 'tienda', icon: '🧣', price: 60, tag: 'Otoño' });
  assert.equal(alta.status, 201);
  assert.deepEqual(alta.body, { id: alta.body.id, name: 'Bufanda roja', group: 'tienda', icon: '🧣', price: 60, tags: ['Otoño'], active: true });

  const off = await call('PATCH', `/catalogo/articulos/${alta.body.id}`, { active: false });
  assert.deepEqual([off.status, off.body.active], [200, false]);
  assert.equal((await call('PATCH', `/catalogo/articulos/${alta.body.id}`, {})).status, 400);
  assert.equal((await call('PATCH', '/catalogo/articulos/abc', { active: true })).status, 404);
  assert.equal((await call('POST', '/catalogo/articulos', { name: 'x', group: 'tienda', icon: '⭐', price: -5 })).status, 400);
  assert.equal((await call('GET', '/catalogo/articulos')).body.length, 1);
});

test('14.3 · push: audiencia, envío 201 (en cola sin Firebase), duplicado 409 e historial', async () => {
  await db.user.create({ data: { email: 'p@x.mx', role: 'PLAYER', status: 'ACTIVE' } });
  assert.deepEqual((await call('GET', '/push/audiencia')).body, { total: 1 });

  const aviso = await call('POST', '/push', { title: 'Semana de exámenes', message: 'Activa el modo concentración.', target: { kind: 'todos' } });
  assert.equal(aviso.status, 201);
  assert.deepEqual(Object.keys(aviso.body).sort(), ['deliveredPct', 'id', 'message', 'recipients', 'sentAt', 'status', 'target', 'title']);
  assert.deepEqual([aviso.body.status, aviso.body.recipients, aviso.body.target], ['en_cola', 1, { kind: 'todos' }]);

  const dup = await call('POST', '/push', { title: 'semana de exámenes', message: 'otra', target: { kind: 'todos' } });
  assert.equal(dup.status, 409);
  assert.equal((await call('POST', '/push', { title: 'Hola', message: 'x', target: { kind: 'usuario', username: 'nadie' } })).status, 404);
  assert.equal((await call('POST', '/push', { title: '', message: 'x', target: { kind: 'todos' } })).status, 400);
  assert.equal((await call('GET', '/push/historial')).body.length, 1);
});
