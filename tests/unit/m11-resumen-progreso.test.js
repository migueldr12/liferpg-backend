const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateDay } = require('../../src/modules/m11-resumen-progreso/domain/entities/dayProgress');
const { createResumenProgresoService } = require('../../src/modules/m11-resumen-progreso/application/services/resumenProgresoService');
const { validators } = require('../../src/modules/m11-resumen-progreso/interfaces/validators/resumenProgresoValidator');

const USER = '6b0356a060aaa347e384ceb7';
const FRIEND = '6b0356a060aaa347e384ceb8';
const OFFSET = 360; // UTC-6

// Datos reales de Atlas (habits, habit_check_ins)
const leer = { id: 'h1', name: 'Leer 20 páginas', area: 'CULTURE', difficulty: 'MEDIUM', frequency: 'DAILY',
  penaltyType: 'HP', penaltyValue: 10, active: true, startsOn: new Date('2026-11-22T23:47:16.594Z'), archivedAt: null, updatedAt: null };
const caminar = { id: 'h2', name: 'Caminar', area: 'PHYSICAL', difficulty: 'EASY', frequency: 'WEEKLY',
  penaltyType: 'STREAK', penaltyValue: 0, active: true, startsOn: new Date('2026-11-23T00:47:26.179Z'), archivedAt: null, updatedAt: null };
const checkIn = { id: 'c1', habitId: 'h2', periodStart: new Date('2026-11-22T06:00:00Z'), periodEnd: new Date('2026-11-23T06:00:00Z'), revertedAt: null };

function fakeRepo({ saved = [], closures = [], missions = [], friends = false } = {}) {
  return {
    saved,
    findUser: async (id) => ({ id, status: 'ACTIVE', deletedAt: null }),
    findProfile: async () => ({ currentStreak: 0, bestStreak: 0 }),
    areFriends: async () => friends,
    listHabits: async () => [leer, caminar],
    listCheckIns: async () => [checkIn],
    listMissions: async () => missions,
    listClosures: async () => closures,
    saveClosure: async (userId, day) => { saved.push(day); },
  };
}
const svc = (repo, nowIso) => createResumenProgresoService({ repo, now: () => new Date(nowIso), defaultUtcOffset: OFFSET });

describe('evaluateDay con los datos reales', () => {
  test('domingo 22-nov: 2 debidos, 1 cumplido, pendiente = Leer', () => {
    const d = evaluateDay({ habits: [leer, caminar], checkIns: [checkIn], dayStart: new Date('2026-11-22T06:00:00Z'), utcOffset: OFFSET });
    assert.equal(d.habitsDue, 2);
    assert.equal(d.habitsCompleted, 1);
    assert.equal(d.completionRate, 50);
    assert.deepEqual(d.pendingHabits.map((h) => h.name), ['Leer 20 páginas']);
  });
  test('lunes 23-nov: el semanal no se debe; el diario queda pendiente', () => {
    const d = evaluateDay({ habits: [leer, caminar], checkIns: [checkIn], dayStart: new Date('2026-11-23T06:00:00Z'), utcOffset: OFFSET });
    assert.equal(d.habitsDue, 1);
    assert.equal(d.completionRate, 0);
  });
  test('un check-in revertido no cuenta', () => {
    const d = evaluateDay({ habits: [caminar], checkIns: [{ ...checkIn, revertedAt: new Date() }], dayStart: new Date('2026-11-22T06:00:00Z'), utcOffset: OFFSET });
    assert.equal(d.habitsCompleted, 0);
  });
  test('antes de empezar el hábito no se debe', () => {
    const d = evaluateDay({ habits: [leer], checkIns: [], dayStart: new Date('2026-11-21T06:00:00Z'), utcOffset: OFFSET });
    assert.equal(d.habitsDue, 0);
    assert.equal(d.completionRate, null);
  });
});

describe('servicio', () => {
  test('pendientes de hoy (22-nov local, aún en curso)', async () => {
    const r = await svc(fakeRepo(), '2026-11-23T00:55:00Z').consultarMisionesPendientes(USER, {});
    assert.equal(r.fecha, '2026-11-22');
    assert.equal(r.cerrado, false);
    assert.equal(r.totalPendientes, 1);
  });

  test('cumplimiento: guarda los cierres de días terminados y calcula el promedio', async () => {
    const repo = fakeRepo();
    const r = await svc(repo, '2026-11-24T12:00:00Z').calcularTasaCumplimientoDiaria(USER, { desde: '2026-11-22', hasta: '2026-11-23' });
    assert.deepEqual(r.dias.map((d) => d.tasaCumplimiento), [50, 0]);
    assert.equal(r.promedio, 25);
    assert.equal(repo.saved.length, 2);
  });

  test('días de baja actividad bajo 50 %', async () => {
    const r = await svc(fakeRepo(), '2026-11-24T12:00:00Z').consultarDiasBajaActividad(USER, { desde: '2026-11-22', hasta: '2026-11-23' });
    assert.deepEqual(r.dias.map((d) => d.fecha), ['2026-11-23']);
  });

  test('un cierre guardado manda sobre el cálculo en vivo', async () => {
    const closures = [{ dayStart: new Date('2026-11-22T06:00:00Z'), habitsDue: 4, habitsCompleted: 4, completionRate: 100, pendingCount: 0, penaltiesApplied: 0 }];
    const repo = fakeRepo({ closures });
    const r = await svc(repo, '2026-11-24T12:00:00Z').calcularTasaCumplimientoDiaria(USER, { desde: '2026-11-22', hasta: '2026-11-22' });
    assert.equal(r.dias[0].tasaCumplimiento, 100);
    assert.equal(repo.saved.length, 0);
  });

  test('historial detecta lo que se repite sin cumplir', async () => {
    const r = await svc(fakeRepo(), '2026-11-25T12:00:00Z').consultarPendientesPorFecha(USER, { desde: '2026-11-22', hasta: '2026-11-24' });
    assert.equal(r.repetidos[0].nombre, 'Leer 20 páginas');
    assert.equal(r.repetidos[0].dias, 3);
  });

  test('racha: check-in hoy = ACTIVA', async () => {
    const r = await svc(fakeRepo(), '2026-11-23T00:55:00Z').mostrarEstadoConsistencia(USER, {});
    assert.equal(r.estado, 'ACTIVA');
    assert.equal(r.rachaActual, 1);
  });

  test('racha: al día siguiente sin check-in = EN_RIESGO; dos días después = ROTA', async () => {
    const riesgo = await svc(fakeRepo(), '2026-11-24T00:55:00Z').mostrarEstadoConsistencia(USER, {});
    assert.equal(riesgo.estado, 'EN_RIESGO');
    assert.equal(riesgo.rachaActual, 1);
    const rota = await svc(fakeRepo(), '2026-11-25T12:00:00Z').mostrarEstadoConsistencia(USER, {});
    assert.equal(rota.estado, 'ROTA');
    assert.equal(rota.mejorRacha, 1);
  });

  test('ver a otro usuario exige amistad', async () => {
    await assert.rejects(svc(fakeRepo({ friends: false }), '2026-11-23T00:55:00Z').consultarRachaActual(USER, { usuarioId: FRIEND }), { status: 403 });
    const ok = await svc(fakeRepo({ friends: true }), '2026-11-23T00:55:00Z').consultarRachaActual(USER, { usuarioId: FRIEND });
    assert.equal(ok.rachaActual, 1);
  });

  test('fechas futuras se rechazan', async () => {
    await assert.rejects(svc(fakeRepo(), '2026-11-23T00:55:00Z').consultarMisionesPendientes(USER, { fecha: '2026-12-01' }), { status: 400 });
  });

  test('misiones: pendiente al cierre, completada después sigue contando ese día', async () => {
    const m = { id: 'm1', title: 'Entregar tarea', area: 'FOCUS', estimatedMinutes: 45, status: 'COMPLETED',
      createdAt: new Date('2026-11-20T10:00:00Z'), completedAt: new Date('2026-11-24T10:00:00Z'), failedAt: null };
    const r = await svc(fakeRepo({ missions: [m] }), '2026-11-25T12:00:00Z').consultarMisionesPendientes(USER, { fecha: '2026-11-22' });
    assert.equal(r.misiones.length, 1);
    const despues = await svc(fakeRepo({ missions: [m] }), '2026-11-25T12:00:00Z').consultarMisionesPendientes(USER, { fecha: '2026-11-24' });
    assert.equal(despues.misiones.length, 0);
  });
});

describe('validadores', () => {
  test('rechazan fecha, umbral, utcOffset y usuarioId inválidos', () => {
    assert.throws(() => validators.fecha({ fecha: '2026-02-31' }), { code: 'VALIDATION_ERROR' });
    assert.throws(() => validators.rangoConUmbral({ umbral: '150' }), { code: 'VALIDATION_ERROR' });
    assert.throws(() => validators.soloUsuario({ utcOffset: 'abc' }), { code: 'VALIDATION_ERROR' });
    assert.throws(() => validators.soloUsuario({ usuarioId: '123' }), { code: 'VALIDATION_ERROR' });
  });
  test('aceptan valores válidos', () => {
    assert.deepEqual(validators.rangoConUmbral({ desde: '2026-11-01', umbral: '40', utcOffset: '360' }), { utcOffset: 360, desde: '2026-11-01', umbral: 40 });
  });
});
