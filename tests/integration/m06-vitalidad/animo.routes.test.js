// Pruebas HTTP del M06 (/api/v1/animo) con un repositorio en memoria: comprueban el
// contrato de docs/API.md del móvil (ruta → validador → controlador → servicio → repositorio).

const test = require('node:test');
const assert = require('node:assert/strict');

const { encenderAnimo } = require('../../support/appAnimo');
const { InMemoryMoodRepository } = require('../../support/InMemoryMoodRepository');

const YO = 'a'.repeat(24);
const OTRA = 'c'.repeat(24);
let api;
const call = (method, path, body, userId = YO) => api.call(method, path, body, userId);

test.before(async () => {
  api = await encenderAnimo({ moodRepository: new InMemoryMoodRepository(), now: () => new Date('2026-11-14T03:00:00Z') });
});

test.after(() => api.apagar());

test('GET /animo/hoy responde null (200) cuando hoy no hay registro', async () => {
  const hoy = await call('GET', '/animo/hoy');
  assert.equal(hoy.status, 200);
  assert.equal(hoy.body, null);
});

test('POST /animo registra (201, +5 XP) y el segundo del día actualiza (200, 0 XP)', async () => {
  const r1 = await call('POST', '/animo', { mood: 4, energy: 6, factors: ['motivada'] });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.xpAwarded, 5);
  assert.deepEqual(Object.keys(r1.body.log).sort(), ['createdAt', 'date', 'energy', 'factors', 'id', 'mood']);
  assert.equal(r1.body.log.date, '2026-11-13'); // 21:00 del 13 en México

  const r2 = await call('POST', '/animo', { mood: 3, energy: 5 });
  assert.deepEqual([r2.status, r2.body.xpAwarded, r2.body.log.id], [200, 0, r1.body.log.id]);

  const hoy = await call('GET', '/animo/hoy');
  assert.equal(hoy.body.mood, 3);
  assert.deepEqual(hoy.body.factors, []);
});

test('Responde 400 con { error, code } si el body está mal formado o fuera de rango', async () => {
  const sinAnimo = await call('POST', '/animo', { energy: 5 });
  assert.equal(sinAnimo.status, 400);
  assert.equal(typeof sinAnimo.body.error, 'string');
  assert.equal(sinAnimo.body.code, 'VALIDATION_ERROR');

  const energia = await call('POST', '/animo', { mood: 4, energy: 11 });
  assert.equal(energia.body.error, 'La energía debe ser un entero de 0 a 10.');

  assert.equal((await call('POST', '/animo', { mood: 9, energy: 5 })).status, 400);
  assert.equal((await call('POST', '/animo', { mood: 4, energy: 5, factors: ['otro'] })).status, 400);
  assert.equal((await call('GET', '/animo/tendencia?periodo=anio')).status, 400);
  assert.equal((await call('PUT', '/animo/recordatorio', { enabled: true, time: '8pm' })).status, 400);
  assert.equal((await call('POST', '/animo/diario', { text: '   ' })).status, 400);
  assert.equal((await call('POST', '/animo/diario', { text: 'x'.repeat(501) })).status, 400);
});

test('Responde 401 sin usuario o si x-user-id no es un id de MongoDB', async () => {
  for (const userId of [null, 'u-1']) {
    const r = await call('GET', '/animo/hoy', undefined, userId);
    assert.equal(r.status, 401);
    assert.equal(r.body.code, 'UNAUTHORIZED');
  }
});

test('GET /animo/tendencia regresa 7 o 30 puntos, terminando hoy, con resumen y patrón', async () => {
  const semana = await call('GET', '/animo/tendencia?periodo=semana');
  assert.equal(semana.status, 200);
  assert.equal(semana.body.period, 'semana');
  assert.equal(semana.body.points.length, 7);
  assert.deepEqual([semana.body.from, semana.body.to], ['2026-11-07', '2026-11-13']);
  assert.equal(semana.body.points[6].mood, 3);
  assert.equal(semana.body.points[0].mood, null);
  assert.equal(typeof semana.body.summary.pattern, 'string');
  assert.equal((await call('GET', '/animo/tendencia?periodo=mes')).body.points.length, 30);
});

test('Recordatorio: valor por defecto, PUT y GET', async () => {
  assert.deepEqual((await call('GET', '/animo/recordatorio')).body, { enabled: true, time: '20:00' });
  const put = await call('PUT', '/animo/recordatorio', { enabled: false, time: '07:45' });
  assert.deepEqual([put.status, put.body], [200, { enabled: false, time: '07:45' }]);
  assert.deepEqual((await call('GET', '/animo/recordatorio')).body, { enabled: false, time: '07:45' });
});

test('Diario: crear (201), editar, listar, borrar (204) y 404 si no existe', async () => {
  const creada = await call('POST', '/animo/diario', { text: '  Terminé el ensayo  ' });
  assert.equal(creada.status, 201);
  assert.deepEqual([creada.body.text, creada.body.shared, creada.body.mood], ['Terminé el ensayo', false, 3]);

  const editada = await call('PUT', `/animo/diario/${creada.body.id}`, { text: 'Terminé el ensayo.', shared: true });
  assert.deepEqual([editada.status, editada.body.shared, editada.body.text], [200, true, 'Terminé el ensayo.']);
  assert.equal((await call('GET', '/animo/diario')).body.length, 1);

  const borrada = await call('DELETE', `/animo/diario/${creada.body.id}`);
  assert.deepEqual([borrada.status, borrada.body], [204, undefined]);
  assert.equal((await call('DELETE', `/animo/diario/${creada.body.id}`)).status, 404);
  assert.equal((await call('PUT', '/animo/diario/no-existe', { text: 'x' })).status, 404);
});

test('Cada usuario solo ve y modifica lo suyo', async () => {
  const mia = await call('POST', '/animo/diario', { text: 'Solo mía' });
  assert.equal((await call('GET', '/animo/hoy', undefined, OTRA)).body, null);
  assert.deepEqual((await call('GET', '/animo/diario', undefined, OTRA)).body, []);
  assert.equal((await call('PUT', `/animo/diario/${mia.body.id}`, { shared: true }, OTRA)).status, 404);
  assert.equal((await call('DELETE', `/animo/diario/${mia.body.id}`, undefined, OTRA)).status, 404);
  assert.equal((await call('GET', '/animo/diario')).body.length, 1);
});
