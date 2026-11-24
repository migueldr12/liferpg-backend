const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Las pruebas no dependen del .env local: dotenv no pisa variables que ya existen
process.env.DEV_USER_ID = '';
process.env.TIME_ZONE = 'America/Mexico_City';

const { createApp } = require('../../src/app');
const { createMemoryDiaryRepository } = require('../support/memoryDiaryRepository');

// Flujo completo del M09 por HTTP con las rutas que anota la PWA (diarioApi.js),
// un repositorio en memoria y un reloj fijo: martes 24 nov 2026, 12:00 en CDMX.
const USER = 'a'.repeat(24);
const OTHER = 'b'.repeat(24);
const M1 = '1'.repeat(24); // misión de enfoque completada con bloqueo
const M2 = '2'.repeat(24); // misión de cultura fallida (se rindió)
const M3 = '3'.repeat(24); // misión de otro usuario
const S1 = '4'.repeat(24); // sesión de enfoque de un hábito
const H1 = '5'.repeat(24); // hábito diario
const H2 = '6'.repeat(24); // hábito semanal

const d = (s) => new Date(s);
function seed() {
  return createMemoryDiaryRepository({
    missions: [
      { userId: USER, id: M1, title: 'Repasar álgebra', type: 'enfoque', durationMin: 25, status: 'completada', createdAt: d('2026-11-20T10:00:00Z'), completedAt: d('2026-11-23T17:00:00Z'), failedAt: null, xp: 30, points: 25, validation: 'bloqueo', failReason: null, sessionStartedAt: d('2026-11-23T16:35:00Z') },
      { userId: USER, id: M2, title: 'Preparar exposición', type: 'cultura', durationMin: 50, status: 'fallida', createdAt: d('2026-11-19T10:00:00Z'), completedAt: null, failedAt: d('2026-11-20T22:10:00Z'), xp: 0, points: 0, validation: null, failReason: 'rendicion', sessionStartedAt: d('2026-11-20T21:50:00Z') },
      { userId: OTHER, id: M3, title: 'Ajena', type: 'fisico', durationMin: 30, status: 'completada', createdAt: d('2026-11-22T10:00:00Z'), completedAt: d('2026-11-22T11:00:00Z'), failedAt: null, xp: 36, points: 30, validation: 'manual', failReason: null, sessionStartedAt: null },
    ],
    sessions: [
      { userId: USER, id: S1, type: 'enfoque', habitName: 'Meditar', plannedMinutes: 10, status: 'completada', startedAt: d('2026-11-22T15:50:00Z'), endedAt: d('2026-11-22T16:00:00Z'), xp: 12, points: 10, abandonReason: null },
    ],
    habits: [
      { userId: USER, id: H1, name: 'Caminar 8 000 pasos', type: 'fisico', difficulty: 'facil', frequency: 'diario', focusMinutes: null, active: true, startsOn: d('2026-11-21T08:00:00Z'), archivedAt: null },
      { userId: USER, id: H2, name: 'Leer un capítulo', type: 'cultura', difficulty: 'media', frequency: 'semanal', focusMinutes: 30, active: true, startsOn: d('2026-11-02T08:00:00Z'), archivedAt: null },
    ],
    checkIns: [
      { userId: USER, id: 'c1', habitId: H1, dayKey: '2026-11-21', completedAt: d('2026-11-21T14:00:00Z'), xp: 15, points: 10 },
      { userId: USER, id: 'c2', habitId: H1, dayKey: '2026-11-23', completedAt: d('2026-11-23T15:00:00Z'), xp: 15, points: 10 },
      { userId: USER, id: 'c3', habitId: H2, dayKey: '2026-11-12', completedAt: d('2026-11-12T20:00:00Z'), xp: 30, points: 20 },
    ],
  });
}

describe('M09 · /api/v1/diario', () => {
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
  const ids = (rows) => rows.map((r) => r.id);

  beforeEach(async () => {
    clock = new Date('2026-11-24T18:00:00Z');
    const app = createApp({ pingDatabase: async () => ({}), diaryRepository: seed(), now: () => clock });
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/v1`;
  });

  afterEach(() => server.close());

  test('sin usuario responde 401', async () => {
    const res = await call('GET', '/diario/actividades', { user: null });
    assert.equal(res.status, 401);
    assert.equal(typeof res.body.error, 'string');
  });

  test('RDF091: hábitos, misiones y sesiones del usuario, de la más reciente a la más antigua', async () => {
    const res = await call('GET', '/diario/actividades');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 11);
    assert.ok(!ids(res.body).includes(`mision-${M3}`), 'no incluye actividades de otro usuario');
    assert.ok(res.body.every((a, i) => i === 0 || res.body[i - 1].at >= a.at), 'ordenado por fecha');
    const m1 = res.body.find((a) => a.id === `mision-${M1}`);
    assert.deepEqual(
      { ...m1 },
      { id: `mision-${M1}`, title: 'Repasar álgebra', type: 'enfoque', origin: 'mision', status: 'hecha', at: '2026-11-23T17:00:00.000Z', durationMin: 25, points: 25, xp: 30, validation: 'bloqueo' },
    );
    const s1 = res.body.find((a) => a.id === `sesion-${S1}`);
    assert.equal(s1.title, 'Sesión de enfoque · Meditar');
    const habit = res.body.filter((a) => a.id.startsWith(`habito-${H1}`)).map((a) => [a.id.slice(-10), a.status]);
    assert.deepEqual(habit.sort(), [['2026-11-21', 'hecha'], ['2026-11-22', 'fallida'], ['2026-11-23', 'hecha'], ['2026-11-24', 'pendiente']]);
  });

  test('RDF092: filtros por tipo, origen, estado y fecha; un filtro inválido responde 400', async () => {
    const byType = await call('GET', '/diario/actividades?tipo=cultura');
    assert.ok(byType.body.length > 0 && byType.body.every((a) => a.type === 'cultura'));
    const missions = await call('GET', '/diario/actividades?origen=mision');
    assert.deepEqual(ids(missions.body), [`mision-${M1}`, `mision-${M2}`]);
    const failed = await call('GET', '/diario/actividades?estado=fallida&origen=habito');
    assert.deepEqual(failed.body.map((a) => a.id.slice(-10)).sort(), ['2026-11-02', '2026-11-16', '2026-11-22']);
    const recent = await call('GET', '/diario/actividades?desde=2026-11-23T00:00:00.000Z');
    assert.ok(recent.body.every((a) => a.at >= '2026-11-23T00:00:00.000Z'));
    assert.deepEqual(recent.body.length, 4);
    for (const q of ['tipo=magia', 'origen=libro', 'estado=quizas', 'desde=ayer']) {
      const bad = await call('GET', `/diario/actividades?${q}`);
      assert.equal(bad.status, 400, q);
      assert.equal(typeof bad.body.error, 'string');
    }
  });

  test('RDF093: detalle de una misión con su recorrido y notas', async () => {
    const res = await call('GET', `/diario/actividades/mision-${M1}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.timeline.map((t) => t.label), ['Creada', 'Sesión de enfoque iniciada', 'Completada con modo concentración']);
    assert.deepEqual(res.body.notes, []);
    const failed = await call('GET', `/diario/actividades/mision-${M2}`);
    assert.equal(failed.body.timeline.at(-1).label, 'Te rendiste · sin puntos');
  });

  test('RDF093: detalle de un hábito por día y de una sesión', async () => {
    const pending = await call('GET', `/diario/actividades/habito-${H1}-2026-11-24`);
    assert.equal(pending.status, 200);
    assert.equal(pending.body.status, 'pendiente');
    assert.equal(pending.body.timeline.at(-1).label, 'Pendiente de check-in · cierra hoy');
    const weekly = await call('GET', `/diario/actividades/habito-${H2}-2026-11-09`);
    assert.deepEqual([weekly.body.status, weekly.body.points, weekly.body.difficulty], ['hecha', 20, 'Media']);
    const session = await call('GET', `/diario/actividades/sesion-${S1}`);
    assert.deepEqual(session.body.timeline.map((t) => t.label), ['Sesión iniciada', 'Completada sin salir de la app']);
  });

  test('RDF093: 404 para ids que no son del diario o de otro usuario', async () => {
    const paths = [
      `mision-${M3}`, // de otro usuario
      `mision-${'9'.repeat(24)}`, // no existe
      `habito-${H1}-2026-11-25`, // día futuro
      `habito-${H1}-2026-11-10`, // antes de que empezara el hábito
      `habito-${H2}-2026-11-12`, // semanal, no es lunes
      'a-5', // id de los datos simulados
    ];
    for (const p of paths) {
      const res = await call('GET', `/diario/actividades/${p}`);
      assert.equal(res.status, 404, p);
      assert.equal(res.body.error, 'No encontramos esa actividad.');
    }
  });

  test('RDF094 y RDF095: agregar, editar y eliminar notas de seguimiento', async () => {
    const path = `/diario/actividades/mision-${M1}/notas`;
    assert.equal((await call('POST', path, { body: { text: '   ' } })).status, 400);
    const tooLong = await call('POST', path, { body: { text: 'x'.repeat(501) } });
    assert.deepEqual([tooLong.status, tooLong.body.error], [400, 'La nota admite hasta 500 caracteres.']);

    const first = await call('POST', path, { body: { text: '  Terminé los ejercicios 1 a 20.  ' } });
    assert.equal(first.status, 201);
    assert.deepEqual(first.body, { id: first.body.id, text: 'Terminé los ejercicios 1 a 20.', at: '2026-11-24T18:00:00.000Z', edited: false });
    clock = new Date('2026-11-24T18:30:00Z');
    const second = await call('POST', path, { body: { text: 'Armé la guía del examen.' } });

    const detail = await call('GET', `/diario/actividades/mision-${M1}`);
    assert.deepEqual(ids(detail.body.notes), [second.body.id, first.body.id]); // la más reciente primero

    clock = new Date('2026-11-24T19:00:00Z');
    const edited = await call('PUT', `${path}/${first.body.id}`, { body: { text: 'Terminé los ejercicios 1 a 25.' } });
    assert.equal(edited.status, 200);
    assert.deepEqual([edited.body.text, edited.body.edited, edited.body.at], ['Terminé los ejercicios 1 a 25.', true, '2026-11-24T18:00:00.000Z']);
    assert.equal((await call('PUT', `${path}/${first.body.id}`, { body: { text: '' } })).body.error, 'La nota no puede quedar vacía.');

    // Otra actividad u otro usuario no pueden tocar la nota
    assert.equal((await call('PUT', `/diario/actividades/mision-${M2}/notas/${first.body.id}`, { body: { text: 'x' } })).status, 404);
    assert.equal((await call('DELETE', `${path}/${first.body.id}`, { user: OTHER })).status, 404);

    assert.equal((await call('DELETE', `${path}/${first.body.id}`)).status, 204);
    const gone = await call('DELETE', `${path}/${first.body.id}`);
    assert.deepEqual([gone.status, gone.body.error], [404, 'La nota ya no existe.']);
    assert.deepEqual(ids((await call('GET', `/diario/actividades/mision-${M1}`)).body.notes), [second.body.id]);
  });

  test('RDF094: notas en un hábito pendiente y 404 en una actividad que no existe', async () => {
    const res = await call('POST', `/diario/actividades/habito-${H1}-2026-11-24/notas`, { body: { text: 'Hoy salgo a caminar en la tarde.' } });
    assert.equal(res.status, 201);
    const missing = await call('POST', `/diario/actividades/mision-${M3}/notas`, { body: { text: 'x' } });
    assert.equal(missing.status, 404);
  });

  test('RDF096: actividades cumplidas por día de la semana, por día del mes y por mes del año', async () => {
    const week = await call('GET', '/diario/graficas/cumplimiento?rango=semana');
    assert.equal(week.status, 200);
    assert.deepEqual(week.body.map((b) => b.label), ['Mié 18', 'Jue 19', 'Vie 20', 'Sáb 21', 'Dom 22', 'Lun 23', 'Hoy']);
    const counts = Object.fromEntries(week.body.map((b) => [b.key, [b.cultura, b.fisico, b.enfoque]]));
    assert.deepEqual(counts['2026-11-21'], [0, 1, 0]);
    assert.deepEqual(counts['2026-11-22'], [0, 0, 1]);
    assert.deepEqual(counts['2026-11-23'], [0, 1, 1]);
    assert.deepEqual(counts['2026-11-20'], [0, 0, 0]); // la misión fallida no cuenta

    const month = await call('GET', '/diario/graficas/cumplimiento?rango=mes');
    assert.equal(month.body.length, 30);
    assert.deepEqual(month.body.find((b) => b.key === '2026-11-12'), { key: '2026-11-12', label: '', cultura: 1, fisico: 0, enfoque: 0 });

    const year = await call('GET', '/diario/graficas/cumplimiento?rango=anio');
    assert.deepEqual(year.body.map((b) => b.label), ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']);
    assert.deepEqual(year.body.at(-1), { key: '2026-11', label: 'Nov', cultura: 1, fisico: 2, enfoque: 2 });

    assert.equal((await call('GET', '/diario/graficas/cumplimiento')).body.length, 7); // semana por defecto
    assert.equal((await call('GET', '/diario/graficas/cumplimiento?rango=siglo')).status, 400);
  });

  test('RDF097: distribución por tipo en el rango elegido', async () => {
    assert.deepEqual((await call('GET', '/diario/graficas/distribucion?rango=semana')).body, { cultura: 0, fisico: 2, enfoque: 2 });
    assert.deepEqual((await call('GET', '/diario/graficas/distribucion?rango=mes')).body, { cultura: 1, fisico: 2, enfoque: 2 });
    // El otro usuario solo ve su propia misión física
    assert.deepEqual((await call('GET', '/diario/graficas/distribucion?rango=semana', { user: OTHER })).body, { cultura: 0, fisico: 1, enfoque: 0 });
  });
});
