// Pruebas HTTP del M12 (/api/v1/retos) con los repositorios Prisma reales sobre el
// cliente falso: contrato de la PWA (retosApi.js), invitaciones, aportaciones automáticas
// (RDF119), recompensa al cumplir la meta (RDF121), métricas y ranking semanal.

const test = require('node:test');
const assert = require('node:assert/strict');

const { encender } = require('../../support/servidorPrueba');
const { createRetosModule } = require('../../../src/modules/m12-retos-grupo');
const { PrismaSocialRepository } = require('../../../src/modules/m12-retos-grupo/infrastructure/repositories/PrismaSocialRepository');
const { PrismaChallengeRepository } = require('../../../src/modules/m12-retos-grupo/infrastructure/repositories/PrismaChallengeRepository');
const { PrismaActivityRepository } = require('../../../src/modules/m12-retos-grupo/infrastructure/repositories/PrismaActivityRepository');
const { crearPrismaFalso, nuevoId } = require('../../support/prismaFalso');

const db = crearPrismaFalso();
let ahora = new Date('2026-11-18T18:00:00Z'); // miércoles 18, 12:00 en León
let api;
const YO = nuevoId();
const ANA = nuevoId();
const LUIS = nuevoId();
const EXTRAÑO = nuevoId();
const call = (method, path, body, userId = YO) => api.call(method, path, body, userId);
const minutos = (n) => new Date(ahora.getTime() + n * 60000);

test.before(async () => {
  const jugador = async (id, alias, displayName, color) => {
    await db.user.create({ data: { id, email: `${alias}@x.mx`, displayName, role: 'PLAYER', status: 'ACTIVE' } });
    await db.playerProfile.create({ data: { userId: id, alias, mascotColor: color, level: 5 } });
  };
  await jugador(YO, 'Vale', 'Valeria', '#9c27b0');
  await jugador(ANA, 'Ana', 'Ana López', '#29b6f6');
  await jugador(LUIS, 'Luis', 'Luis Pérez', '#ff7043');
  await jugador(EXTRAÑO, 'Otro', 'Otro', '#000000');
  await db.friendship.create({ data: { pairKey: 'a', requesterId: YO, addresseeId: ANA, status: 'ACCEPTED' } });
  await db.friendship.create({ data: { pairKey: 'b', requesterId: LUIS, addresseeId: YO, status: 'ACCEPTED' } });
  await db.friendship.create({ data: { pairKey: 'c', requesterId: YO, addresseeId: EXTRAÑO, status: 'PENDING' } });
  await db.catalogItem.create({ data: { name: 'Cofre raro', group: 'regalables', icon: '🎁', price: 120, active: true, custom: false, tags: [] } });

  const { router } = createRetosModule({
    now: () => ahora,
    socialRepository: new PrismaSocialRepository({ db }),
    challengeRepository: new PrismaChallengeRepository({ db }),
    activityRepository: new PrismaActivityRepository({ db }),
    devUserId: null,
  });
  api = await encender((r) => r.use('/retos', router));
});

test.after(() => api.apagar());

test('sin usuario responde 401', async () => {
  assert.equal((await call('GET', '/retos', undefined, null)).status, 401);
});

test('GET /retos/amigos: solo amistades aceptadas, con nombre, inicial y color', async () => {
  const r = await call('GET', '/retos/amigos');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((p) => [p.name, p.avatar, p.color]).sort(), [['Ana', 'A', '#29b6f6'], ['Luis', 'L', '#ff7043']]);
});

let reto;
test('RDF117 · POST /retos crea el reto (201); el creador participa y los invitados quedan pendientes', async () => {
  const base = { title: 'Club de lectura', type: 'cultura', metric: 'habitos', goal: 4, deadline: '2026-11-25', invited: [ANA, LUIS] };
  const r = await call('POST', '/retos', base);
  assert.equal(r.status, 201);
  reto = r.body;
  assert.deepEqual(
    [reto.title, reto.type, reto.metric, reto.unit, reto.goal, reto.deadline, reto.status, reto.reward, reto.invitedCount],
    ['Club de lectura', 'cultura', 'habitos', 'hábitos cumplidos', 4, '2026-11-25', 'activo', 'Cofre raro', 2],
  );
  assert.deepEqual(reto.participants, [{ id: YO, name: 'Vale', avatar: 'V', color: '#9c27b0', amount: 0 }]);

  assert.equal((await call('POST', '/retos', { ...base, invited: [EXTRAÑO] })).body.error, 'Solo puedes invitar a tus amigos.');
  assert.equal((await call('POST', '/retos', { ...base, deadline: '2026-11-18' })).status, 400);
  assert.equal((await call('POST', '/retos', { ...base, invited: [] })).status, 400);
  assert.equal((await call('POST', '/retos', { ...base, metric: 'km' })).status, 400);
});

test('RDF118 · invitaciones: Ana acepta (200 con el reto) y Luis rechaza (204)', async () => {
  const inv = await call('GET', '/retos/invitaciones', undefined, ANA);
  assert.equal(inv.body.length, 1);
  assert.deepEqual([inv.body[0].from, inv.body[0].fromPerson.name, inv.body[0].challenge.title], [YO, 'Vale', 'Club de lectura']);

  ahora = minutos(10);
  const unirse = await call('POST', `/retos/invitaciones/${inv.body[0].id}`, { accept: true }, ANA);
  assert.equal(unirse.status, 200);
  assert.deepEqual(unirse.body.participants.map((p) => p.name).sort(), ['Ana', 'Vale']);
  assert.equal(unirse.body.invitedCount, 1);
  assert.equal((await call('POST', `/retos/invitaciones/${inv.body[0].id}`, { accept: true }, ANA)).status, 404); // ya respondida

  const deLuis = (await call('GET', '/retos/invitaciones', undefined, LUIS)).body[0];
  assert.equal((await call('POST', `/retos/invitaciones/${deLuis.id}`, { accept: false }, LUIS)).status, 204);
  assert.equal((await call('POST', `/retos/invitaciones/${deLuis.id}`, { accept: 'si' }, LUIS)).status, 400);
  assert.deepEqual((await call('GET', '/retos', undefined, LUIS)).body, []);
});

test('RDF119/120 · las actividades del área suman solas, sin contar dos veces ni antes de unirse', async () => {
  const leer = await db.habit.create({ data: { userId: YO, name: 'Leer', area: 'CULTURE', frequency: 'DAILY', active: true, startsOn: new Date('2026-11-01T06:00Z') } });
  const correr = await db.habit.create({ data: { userId: YO, name: 'Correr', area: 'PHYSICAL', frequency: 'DAILY', active: true, startsOn: new Date('2026-11-01T06:00Z') } });
  const leerAna = await db.habit.create({ data: { userId: ANA, name: 'Leer', area: 'CULTURE', frequency: 'DAILY', active: true, startsOn: new Date('2026-11-01T06:00Z') } });
  const check = (userId, habitId, at, extra = {}) =>
    db.habitCheckIn.create({ data: { userId, habitId, periodStart: at, periodEnd: at, completedAt: at, xpAwarded: 10, pointsAwarded: 5, ...extra } });

  await check(ANA, leerAna.id, minutos(-30)); // antes de que Ana se uniera: no cuenta
  await check(YO, leer.id, minutos(5));
  await check(YO, correr.id, minutos(5)); // otra área: no cuenta
  await check(YO, leer.id, minutos(6), { revertedAt: minutos(7) }); // revertido: no cuenta
  await check(ANA, leerAna.id, minutos(20));
  ahora = minutos(60);

  const lista = await call('GET', '/retos');
  assert.equal(lista.status, 200);
  assert.deepEqual(lista.body[0].participants.map((p) => [p.name, p.amount]), [['Ana', 1], ['Vale', 1]]);
  await call('GET', '/retos');
  assert.equal(db.challengeContribution.rows.length, 2); // idempotente
  assert.equal(db.groupChallenge.rows[0].currentValue, 2);
});

test('RDF121 · al llegar a la meta se completa y la recompensa llega una sola vez a cada participante', async () => {
  const leer = db.habit.rows.find((h) => h.userId === YO && h.area === 'CULTURE');
  for (const m of [61, 62]) {
    await db.habitCheckIn.create({ data: { userId: YO, habitId: leer.id, periodStart: minutos(m), periodEnd: minutos(m), completedAt: minutos(-60 + m), xpAwarded: 10, pointsAwarded: 5 } });
  }
  ahora = minutos(5);
  const r = await call('GET', '/retos');
  assert.deepEqual([r.body[0].status, r.body[0].participants.reduce((n, p) => n + p.amount, 0)], ['completado', 4]);
  await call('GET', '/retos');
  const cofre = db.catalogItem.rows[0].id;
  assert.deepEqual(
    db.inventoryEntry.rows.map((e) => [e.userId, e.catalogItemId, e.quantity, e.source]).sort(),
    [[ANA, cofre, 1, 'REWARD'], [YO, cofre, 1, 'REWARD']].sort(),
  );
});

test('RDF122/123 · GET /retos/metricas: tu cumplimiento por área contra el promedio de tus amigos', async () => {
  const r = await call('GET', '/retos/metricas?periodo=semana');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ['byType', 'friendsCount', 'period']);
  assert.equal(r.body.friendsCount, 2);
  assert.deepEqual(Object.keys(r.body.byType), ['cultura', 'fisico', 'enfoque']);
  assert.equal(typeof r.body.byType.cultura.me, 'number');
  assert.equal(r.body.byType.enfoque.me, null); // sin hábitos ni misiones de enfoque
  assert.equal(r.body.byType.fisico.group, null); // ningún amigo tiene datos de físico
  assert.equal((await call('GET', '/retos/metricas?periodo=anio')).status, 400);
});

test('RDF124/125 · GET /retos/actividad: ranking semanal por área, tú incluido', async () => {
  await db.mission.create({ data: { userId: LUIS, title: 'Ensayo', area: 'CULTURE', status: 'COMPLETED', completedAt: minutos(-10), xpAwarded: 80, pointsAwarded: 40 } });
  const r = await call('GET', '/retos/actividad?area=cultura');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((p) => [p.position, p.name, p.points, p.isMe]), [
    [1, 'Luis', 40, false],
    [2, 'Vale', 15, true],
    [3, 'Ana', 10, false],
  ]);
  assert.equal(r.body[1].fullName, 'Valeria');
  assert.equal((await call('GET', '/retos/actividad?area=arte')).status, 400);
});
