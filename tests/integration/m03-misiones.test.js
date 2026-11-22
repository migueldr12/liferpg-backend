const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Las pruebas no dependen del .env local: dotenv no pisa variables que ya existen
process.env.DEV_USER_ID = '';
process.env.ALLOW_EARLY_FINISH = 'false';

const { createApp } = require('../../src/app');
const { createMemoryMissionRepository } = require('../support/memoryMissionRepository');

// Flujo completo del M03 por HTTP, con las rutas del contrato de la app (docs/API.md del
// móvil), un repositorio en memoria y un reloj controlado.
const USER = 'a'.repeat(24);
const NO_PROFILE = 'b'.repeat(24);

describe('M03 · /api/v1/misiones y /api/v1/sesiones', () => {
  let server;
  let base;
  let clock;

  const call = async (method, path, { body, user = USER } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user && { 'x-user-id': user }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
  const advance = (minutes) => { clock = new Date(clock.getTime() + minutes * 60_000); };
  const createMission = (title, type, durationMin, user) =>
    call('POST', '/misiones', { body: { title, type, durationMin }, user });
  const startSession = async (missionId, user) => (await call('POST', `/misiones/${missionId}/sesiones`, { user })).body;

  beforeEach(async () => {
    clock = new Date('2026-11-22T10:00:00Z');
    const missionRepository = createMemoryMissionRepository({ profiles: { [USER]: {} } });
    const app = createApp({ pingDatabase: async () => ({}), missionRepository, now: () => clock });
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/v1`;
  });

  afterEach(() => server.close());

  test('sin usuario responde 401 con el mensaje en "error"', async () => {
    const res = await call('GET', '/misiones', { user: null });
    assert.equal(res.status, 401);
    assert.equal(typeof res.body.error, 'string');
  });

  test('"u-1" sin DEV_USER_ID configurado responde 401 con instrucciones', async () => {
    const res = await call('GET', '/misiones', { user: 'u-1' });
    assert.equal(res.status, 401);
    assert.match(res.body.error, /DEV_USER_ID/);
  });

  test('crea, lista y filtra misiones activas (RDF035–RDF037)', async () => {
    const created = await createMission('Terminar ensayo de historia', 'enfoque', 50);
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.reward, { xp: 60, points: 50 });
    await createMission('Correr 5 km', 'fisico', 40);

    const all = await call('GET', '/misiones?estado=activa');
    assert.equal(all.body.length, 2);
    const focus = await call('GET', '/misiones?estado=activa&tipo=enfoque');
    assert.deepEqual(focus.body.map((m) => m.title), ['Terminar ensayo de historia']);
    const wrong = await call('GET', '/misiones?estado=completada');
    assert.equal(wrong.status, 400);
  });

  test('GET /misiones/:id devuelve la misión activa y 404 cuando ya no lo está', async () => {
    const { body: mission } = await createMission('Repasar álgebra', 'enfoque', 45);
    const one = await call('GET', `/misiones/${mission.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.title, 'Repasar álgebra');

    const session = await startSession(mission.id);
    await call('POST', `/sesiones/${session.id}/fallar`, { body: { reason: 'rendicion' } });
    const gone = await call('GET', `/misiones/${mission.id}`);
    assert.equal(gone.status, 404);
  });

  test('valida los datos de una misión nueva con un mensaje listo para mostrarse', async () => {
    const res = await call('POST', '/misiones', { body: { title: ' ', type: 'magia', durationMin: 2 } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Escribe un título para la misión.');
    assert.deepEqual(Object.keys(res.body.details).sort(), ['durationMin', 'title', 'type']);
  });

  test('vista previa de la recompensa (RDF038)', async () => {
    const res = await call('GET', '/misiones/recompensa?tipo=cultura&duracion=90');
    assert.deepEqual(res.body, { xp: 108, points: 90 });
  });

  test('Enfoque: sesión con bloqueo, puntos al terminar y resultado (RDF039, RDF041, RDF042)', async () => {
    const { body: mission } = await createMission('Repasar álgebra', 'enfoque', 45);
    const started = await call('POST', `/misiones/${mission.id}/sesiones`);
    assert.equal(started.status, 201);
    assert.equal(started.body.locksDevice, true);
    assert.equal(started.body.durationMin, 45);

    const early = await call('POST', `/sesiones/${started.body.id}/finalizar`);
    assert.equal(early.status, 409);
    assert.ok(early.body.details.remainingSeconds > 0);

    advance(45);
    const done = await call('POST', `/sesiones/${started.body.id}/finalizar`);
    assert.equal(done.status, 200);
    assert.equal(done.body.sessionId, started.body.id);
    assert.equal(done.body.validation, 'bloqueo');
    assert.equal(done.body.claimed, true);
    assert.deepEqual(done.body.mission.reward, { xp: 54, points: 45 });
    assert.equal(done.body.profile.focusPoints, 45);

    const outcome = await call('GET', `/sesiones/${started.body.id}/resultado`);
    assert.equal(outcome.status, 200);
    assert.equal(outcome.body.claimed, true);
    assert.equal(outcome.body.validation, 'bloqueo');
    assert.equal((await call('GET', `/sesiones/${'c'.repeat(24)}/resultado`)).status, 404);
  });

  test('solo una sesión en curso a la vez', async () => {
    const { body: a } = await createMission('A', 'enfoque', 30);
    const { body: b } = await createMission('B', 'cultura', 30);
    await startSession(a.id);
    const second = await call('POST', `/misiones/${b.id}/sesiones`);
    assert.equal(second.status, 409);
    assert.equal(second.body.details.missionId, a.id);
  });

  test('fallar responde 204 y la misión pasa al historial sin puntos (RDF040)', async () => {
    const { body: mission } = await createMission('Preparar exposición', 'enfoque', 50);
    const session = await startSession(mission.id);
    const res = await call('POST', `/sesiones/${session.id}/fallar`, { body: { reason: 'salio_app' } });
    assert.equal(res.status, 204);

    const history = await call('GET', '/misiones/historial');
    assert.equal(history.body[0].status, 'fallida');
    assert.equal(history.body[0].failReason, 'salio_app');
    assert.deepEqual(history.body[0].reward, { xp: 0, points: 0 });

    assert.equal((await call('POST', `/sesiones/${session.id}/fallar`)).status, 409);
    assert.equal((await call('POST', `/sesiones/${session.id}/fallar`, { body: { reason: 'aburrido' } })).status, 400);
  });

  test('Física con smartwatch se valida sola (RDF043)', async () => {
    const { body: mission } = await createMission('Correr 5 km', 'fisico', 40);
    const session = await startSession(mission.id);
    advance(40);
    const activity = { steps: 6840, distanceKm: 5.2, activeMin: 40 };
    const res = await call('POST', `/sesiones/${session.id}/finalizar`, { body: { activity } });
    assert.equal(res.body.validation, 'smartwatch');
    assert.deepEqual(res.body.activity, activity);
    assert.equal(res.body.profile.physicalPoints, 40);
  });

  test('sin smartwatch espera la confirmación manual por sesión (RDF043)', async () => {
    const { body: mission } = await createMission('Terminar novela', 'cultura', 60);
    const session = await startSession(mission.id);

    const early = await call('POST', `/sesiones/${session.id}/validar`);
    assert.equal(early.status, 409);

    advance(60);
    const finished = await call('POST', `/sesiones/${session.id}/finalizar`);
    assert.equal(finished.body.validation, 'manual');
    assert.equal(finished.body.claimed, false);

    const pending = await call('GET', `/sesiones/${session.id}/resultado`);
    assert.equal(pending.body.claimed, false);

    const confirmed = await call('POST', `/sesiones/${session.id}/validar`);
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.claimed, true);
    assert.equal(confirmed.body.profile.culturePoints, 60);

    // Confirmar otra vez no vuelve a pagar
    const again = await call('POST', `/sesiones/${session.id}/validar`);
    assert.equal(again.status, 200);
    assert.equal(again.body.profile, undefined);
  });

  test('historial con completadas y fallidas, de la más reciente a la más antigua (RDF044)', async () => {
    const { body: ok } = await createMission('Repasar álgebra', 'enfoque', 45);
    const s1 = await startSession(ok.id);
    advance(45);
    await call('POST', `/sesiones/${s1.id}/finalizar`);

    const { body: bad } = await createMission('Preparar exposición', 'cultura', 50);
    const s2 = await startSession(bad.id);
    await call('POST', `/sesiones/${s2.id}/fallar`, { body: { reason: 'rendicion' } });

    const all = await call('GET', '/misiones/historial');
    assert.deepEqual(all.body.map((h) => h.status), ['fallida', 'completada']);
    assert.equal(all.body[1].validation, 'bloqueo');
    assert.equal(all.body[0].failReason, 'rendicion');

    const failed = await call('GET', '/misiones/historial?estado=fallida');
    assert.equal(failed.body.length, 1);
    assert.equal((await call('GET', '/misiones/historial?estado=activa')).status, 400);
  });

  test('sin perfil del jugador no se otorgan puntos', async () => {
    const { body: mission } = await createMission('Sin perfil', 'enfoque', 10, NO_PROFILE);
    const session = await startSession(mission.id, NO_PROFILE);
    advance(10);
    const res = await call('POST', `/sesiones/${session.id}/finalizar`, { user: NO_PROFILE });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /perfil/);
  });

  test('las misiones y sesiones de otro usuario no se ven', async () => {
    const { body: mission } = await createMission('Privada', 'enfoque', 10);
    assert.equal((await call('GET', `/misiones/${mission.id}`, { user: NO_PROFILE })).status, 404);
    const session = await startSession(mission.id);
    assert.equal((await call('POST', `/sesiones/${session.id}/fallar`, { user: NO_PROFILE })).status, 404);
  });
});
