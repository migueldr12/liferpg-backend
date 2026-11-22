const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createMemoryMissionRepository } = require('../support/memoryMissionRepository');

// Flujo completo del M03 por HTTP con un repositorio en memoria y un reloj controlado.
const USER = 'a'.repeat(24);
const NO_PROFILE = 'b'.repeat(24);

describe('M03 · /api/v1/misiones', () => {
  let server;
  let base;
  let clock;

  const call = async (method, path, { body, user = USER } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user && { 'X-User-Id': user }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
  const advance = (minutes) => { clock = new Date(clock.getTime() + minutes * 60_000); };
  const createMission = (title, type, durationMin, user) =>
    call('POST', '/misiones', { body: { title, type, durationMin }, user });

  beforeEach(async () => {
    clock = new Date('2026-11-22T10:00:00Z');
    const missionRepository = createMemoryMissionRepository({ profiles: { [USER]: {} } });
    const app = createApp({ pingDatabase: async () => ({}), missionRepository, now: () => clock });
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/v1`;
  });

  afterEach(() => server.close());

  test('sin usuario responde 401', async () => {
    const res = await call('GET', '/misiones', { user: null });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  test('crea, lista y filtra misiones activas (RDF035–RDF037)', async () => {
    const created = await createMission('Terminar ensayo de historia', 'enfoque', 50);
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.reward, { xp: 60, points: 50 });
    assert.equal(created.body.status, 'activa');
    await createMission('Correr 5 km', 'fisico', 40);

    const all = await call('GET', '/misiones');
    assert.equal(all.body.length, 2);
    const focus = await call('GET', '/misiones?tipo=enfoque');
    assert.deepEqual(focus.body.map((m) => m.title), ['Terminar ensayo de historia']);
  });

  test('valida los datos de una misión nueva', async () => {
    const res = await call('POST', '/misiones', { body: { title: ' ', type: 'magia', durationMin: 2 } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(res.body.error.details).sort(), ['durationMin', 'title', 'type']);
  });

  test('vista previa de la recompensa (RDF038)', async () => {
    const res = await call('GET', '/misiones/recompensa?tipo=cultura&duracion=90');
    assert.deepEqual(res.body, { xp: 108, points: 90 });
  });

  test('misión de Enfoque: sesión con bloqueo y puntos al terminar (RDF039, RDF041, RDF042)', async () => {
    const { body: mission } = await createMission('Repasar álgebra', 'enfoque', 45);
    const started = await call('POST', `/misiones/${mission.id}/sesiones`);
    assert.equal(started.status, 201);
    assert.equal(started.body.locksDevice, true);

    const early = await call('POST', `/misiones/sesiones/${started.body.id}/finalizar`);
    assert.equal(early.status, 409);
    assert.ok(early.body.error.details.remainingSeconds > 0);

    advance(45);
    const done = await call('POST', `/misiones/sesiones/${started.body.id}/finalizar`);
    assert.equal(done.status, 200);
    assert.equal(done.body.validation, 'bloqueo');
    assert.equal(done.body.claimed, true);
    assert.deepEqual(done.body.mission.reward, { xp: 54, points: 45 });
    assert.equal(done.body.profile.focusPoints, 45);

    const active = await call('GET', '/misiones');
    assert.equal(active.body.length, 0);
  });

  test('solo una sesión en curso a la vez', async () => {
    const { body: a } = await createMission('A', 'enfoque', 30);
    const { body: b } = await createMission('B', 'cultura', 30);
    await call('POST', `/misiones/${a.id}/sesiones`);
    const second = await call('POST', `/misiones/${b.id}/sesiones`);
    assert.equal(second.status, 409);
    assert.equal(second.body.error.details.missionId, a.id);
  });

  test('rendirse marca la misión como fallida y sin puntos (RDF040)', async () => {
    const { body: mission } = await createMission('Preparar exposición', 'enfoque', 50);
    const { body: session } = await call('POST', `/misiones/${mission.id}/sesiones`);
    const res = await call('POST', `/misiones/sesiones/${session.id}/rendirse`, { body: { reason: 'salio_app' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'fallida');
    assert.equal(res.body.failReason, 'salio_app');
    assert.deepEqual(res.body.reward, { xp: 0, points: 0 });

    const again = await call('POST', `/misiones/sesiones/${session.id}/rendirse`);
    assert.equal(again.status, 409);
  });

  test('misión Física con smartwatch se valida sola (RDF043)', async () => {
    const { body: mission } = await createMission('Correr 5 km', 'fisico', 40);
    const { body: session } = await call('POST', `/misiones/${mission.id}/sesiones`);
    advance(40);
    const activity = { steps: 6840, distanceKm: 5.2, activeMinutes: 40 };
    const res = await call('POST', `/misiones/sesiones/${session.id}/finalizar`, { body: { activity } });
    assert.equal(res.body.validation, 'smartwatch');
    assert.deepEqual(res.body.activity, activity);
    assert.equal(res.body.profile.physicalPoints, 40);
  });

  test('sin smartwatch espera la confirmación manual (RDF043)', async () => {
    const { body: mission } = await createMission('Terminar novela', 'cultura', 60);
    const early = await call('POST', `/misiones/${mission.id}/validacion-manual`);
    assert.equal(early.status, 409);

    const { body: session } = await call('POST', `/misiones/${mission.id}/sesiones`);
    advance(60);
    const finished = await call('POST', `/misiones/sesiones/${session.id}/finalizar`);
    assert.equal(finished.body.validation, 'manual');
    assert.equal(finished.body.claimed, false);

    const confirmed = await call('POST', `/misiones/${mission.id}/validacion-manual`);
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.claimed, true);
    assert.equal(confirmed.body.profile.culturePoints, 60);
  });

  test('historial con completadas y fallidas, filtrable (RDF044)', async () => {
    const { body: ok } = await createMission('Repasar álgebra', 'enfoque', 45);
    const { body: s1 } = await call('POST', `/misiones/${ok.id}/sesiones`);
    advance(45);
    await call('POST', `/misiones/sesiones/${s1.id}/finalizar`);

    const { body: bad } = await createMission('Preparar exposición', 'cultura', 50);
    const { body: s2 } = await call('POST', `/misiones/${bad.id}/sesiones`);
    await call('POST', `/misiones/sesiones/${s2.id}/rendirse`);

    const all = await call('GET', '/misiones/historial');
    assert.deepEqual(all.body.map((h) => h.status), ['fallida', 'completada']);
    assert.equal(all.body[1].validation, 'bloqueo');
    assert.equal(all.body[0].failReason, 'rendicion');

    const failed = await call('GET', '/misiones/historial?estado=fallida');
    assert.equal(failed.body.length, 1);
    const bad400 = await call('GET', '/misiones/historial?estado=activa');
    assert.equal(bad400.status, 400);
  });

  test('sin perfil del jugador no se otorgan puntos', async () => {
    const { body: mission } = await createMission('Sin perfil', 'enfoque', 10, NO_PROFILE);
    const { body: session } = await call('POST', `/misiones/${mission.id}/sesiones`, { user: NO_PROFILE });
    advance(10);
    const res = await call('POST', `/misiones/sesiones/${session.id}/finalizar`, { user: NO_PROFILE });
    assert.equal(res.status, 409);
    assert.match(res.body.error.message, /perfil/);
  });

  test('las misiones de otro usuario no se ven', async () => {
    const { body: mission } = await createMission('Privada', 'enfoque', 10);
    const res = await call('POST', `/misiones/${mission.id}/sesiones`, { user: NO_PROFILE });
    assert.equal(res.status, 404);
  });
});
