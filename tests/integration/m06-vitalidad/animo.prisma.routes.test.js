// Prueba de punta a punta del M06 con el repositorio REAL (PrismaMoodRepository):
// HTTP → validador → controlador → servicio → repositorio Prisma → cliente falso
// (tests/support/prismaFalso.js). Comprueba qué se guarda en cada colección de MongoDB.

const test = require('node:test');
const assert = require('node:assert/strict');

const { encenderAnimo } = require('../../support/appAnimo');
const { PrismaMoodRepository } = require('../../../src/modules/m06-vitalidad/infrastructure/repositories/PrismaMoodRepository');
const { crearPrismaFalso, nuevoId } = require('../../support/prismaFalso');

const USUARIO = nuevoId();
const db = crearPrismaFalso();
let api;
const call = (method, path, body, userId = USUARIO) => api.call(method, path, body, userId);

test.before(async () => {
  await db.playerProfile.create({ data: { userId: USUARIO, xp: 0, moodReminderEnabled: true, moodReminderTime: '20:00' } });
  // 21:00 del 13 de noviembre en León (03:00 UTC del 14)
  api = await encenderAnimo({ moodRepository: new PrismaMoodRepository({ db }), now: () => new Date('2026-11-14T03:00:00.000Z') });
});

test.after(() => api.apagar());

test('flujo completo del Ánimo guardando en las colecciones de MongoDB', async () => {
  assert.equal((await call('GET', '/animo/hoy')).body, null);

  const r1 = await call('POST', '/animo', { mood: 4, energy: 7, factors: ['motivada', 'amigos'] });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.xpAwarded, 5);
  assert.equal(r1.body.log.date, '2026-11-13'); // día de México, no de UTC
  assert.match(r1.body.log.id, /^[a-f\d]{24}$/);
  assert.deepEqual(db.moodLog.rows[0].dayStart, new Date('2026-11-13T00:00:00.000Z'));
  assert.equal(db.playerProfile.rows[0].xp, 5);

  const r2 = await call('POST', '/animo', { mood: 3, energy: 5 });
  assert.deepEqual([r2.status, r2.body.xpAwarded, r2.body.log.id], [200, 0, r1.body.log.id]);
  assert.equal(db.playerProfile.rows[0].xp, 5);
  assert.equal((await call('GET', '/animo/hoy')).body.mood, 3);

  const rec = await call('PUT', '/animo/recordatorio', { enabled: true, time: '21:15' });
  assert.deepEqual(rec.body, { enabled: true, time: '21:15' });
  assert.equal(db.playerProfile.rows[0].moodReminderTime, '21:15');
  assert.deepEqual((await call('GET', '/animo/recordatorio')).body, { enabled: true, time: '21:15' });

  const semana = await call('GET', '/animo/tendencia?periodo=semana');
  assert.equal(semana.body.points.length, 7);
  assert.deepEqual(semana.body.points.at(-1), { date: '2026-11-13', mood: 3, energy: 5 });

  const nueva = await call('POST', '/animo/diario', { text: 'Buen día con amigos' });
  assert.equal(nueva.status, 201);
  assert.deepEqual([nueva.body.date, nueva.body.mood, nueva.body.energy, nueva.body.shared], ['2026-11-13', 3, 5, false]);
  assert.equal(db.journalEntry.rows[0].moodLogId, r1.body.log.id);

  assert.equal((await call('PUT', `/animo/diario/${nueva.body.id}`, { shared: true })).body.shared, true);
  assert.equal((await call('GET', '/animo/diario')).body.length, 1);
  assert.equal((await call('DELETE', `/animo/diario/${nueva.body.id}`)).status, 204);
  assert.equal((await call('DELETE', `/animo/diario/${nueva.body.id}`)).status, 404);
  assert.equal((await call('PUT', '/animo/diario/abc', { text: 'x' })).status, 404);
});

test('sin perfil de jugador, guardar el recordatorio responde 404', async () => {
  const r = await call('PUT', '/animo/recordatorio', { enabled: false, time: '20:00' }, nuevoId());
  assert.equal(r.status, 404);
});

test('errores de la base: un único repetido (P2002) responde 409 con { error, code }', async () => {
  const otro = nuevoId();
  const original = db.moodLog.findUnique;
  db.moodLog.findUnique = async () => null; // simula dos registros simultáneos del mismo día
  try {
    assert.equal((await call('POST', '/animo', { mood: 4, energy: 5 }, otro)).status, 201);
    const r = await call('POST', '/animo', { mood: 4, energy: 5 }, otro);
    assert.deepEqual([r.status, r.body.code], [409, 'CONFLICT']);
  } finally {
    db.moodLog.findUnique = original;
  }
});
