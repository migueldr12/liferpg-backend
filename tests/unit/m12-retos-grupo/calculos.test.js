// Pruebas de los cálculos del M12 (funciones puras): actividades que cuentan para un reto,
// cumplimiento por área, promedio del grupo y puntos semanales.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  actividadesDelReto,
  vecesEsperadas,
  cumplimientoPorArea,
  promedioGrupo,
  puntosPorArea,
} = require('../../../src/modules/m12-retos-grupo/domain/calculos');
const { GroupChallenge } = require('../../../src/modules/m12-retos-grupo/domain/entities/GroupChallenge');
const { ValidationError } = require('../../../src/modules/m12-retos-grupo/domain/errors');

const D = (iso) => new Date(iso);
const actividad = {
  habits: [
    { id: 'h1', userId: 'yo', area: 'cultura', frequency: 'diario', active: true, startsOn: D('2026-11-01T06:00Z'), archivedAt: null },
    { id: 'h2', userId: 'yo', area: 'fisico', frequency: 'semanal', active: true, startsOn: D('2026-11-01T06:00Z'), archivedAt: null },
    { id: 'h3', userId: 'ana', area: 'cultura', frequency: 'diario', active: true, startsOn: D('2026-11-01T06:00Z'), archivedAt: null },
    { id: 'h4', userId: 'yo', area: 'enfoque', frequency: 'diario', active: false, startsOn: D('2026-11-01T06:00Z'), archivedAt: null },
  ],
  checkIns: [
    { id: 'c1', userId: 'yo', habitId: 'h1', xp: 10, points: 5 },
    { id: 'c2', userId: 'yo', habitId: 'h1', xp: 10, points: 5 },
    { id: 'c3', userId: 'yo', habitId: 'h2', xp: 20, points: 8 },
    { id: 'c4', userId: 'ana', habitId: 'h3', xp: 10, points: 5 },
  ],
  missions: [
    { id: 'm1', userId: 'yo', area: 'cultura', status: 'completada', xp: 50, points: 25 },
    { id: 'm2', userId: 'yo', area: 'cultura', status: 'fallida', xp: 0, points: 0 },
    { id: 'm3', userId: 'yo', area: 'enfoque', status: 'completada', xp: 40, points: 20 },
  ],
  sessions: [
    { id: 's1', userId: 'yo', area: 'enfoque', minutes: 25 },
    { id: 's2', userId: 'yo', area: 'cultura', minutes: 50 },
  ],
};

test('RDF119: actividades que cuentan según la métrica y el área del reto', () => {
  assert.deepEqual(actividadesDelReto({ metric: 'habitos', area: 'cultura' }, actividad, 'yo').map((a) => a.activityId), ['c1', 'c2']);
  assert.deepEqual(actividadesDelReto({ metric: 'misiones', area: 'cultura' }, actividad, 'yo').map((a) => a.activityId), ['m1']);
  assert.deepEqual(actividadesDelReto({ metric: 'minutos', area: 'enfoque' }, actividad, 'yo'), [{ activityType: 'focusSession', activityId: 's1', value: 25 }]);
  // XP: hábitos + misiones; las sesiones no, porque su XP ya está en la misión (M03)
  assert.equal(actividadesDelReto({ metric: 'xp', area: 'cultura' }, actividad, 'yo').reduce((n, a) => n + a.value, 0), 70);
  assert.deepEqual(actividadesDelReto({ metric: 'habitos', area: 'cultura' }, actividad, 'ana').map((a) => a.activityId), ['c4']);
});

test('vecesEsperadas: diario por día, semanal por semana, pausado no cuenta', () => {
  const from = D('2026-11-16T06:00Z');
  const to = D('2026-11-23T06:00Z'); // 7 días
  assert.equal(vecesEsperadas(actividad.habits[0], from, to), 7);
  assert.equal(vecesEsperadas(actividad.habits[1], from, to), 1);
  assert.equal(vecesEsperadas(actividad.habits[3], from, to), 0);
  assert.equal(vecesEsperadas({ ...actividad.habits[0], startsOn: D('2026-11-20T06:00Z') }, from, to), 3);
  assert.equal(vecesEsperadas({ ...actividad.habits[0], archivedAt: D('2026-11-18T06:00Z') }, from, to), 2);
});

test('RDF122: cumplimiento por área y promedio del grupo (sin datos → null)', () => {
  const from = D('2026-11-16T06:00Z');
  const to = D('2026-11-23T06:00Z');
  const mio = cumplimientoPorArea('yo', actividad, from, to);
  // cultura: (2 hábitos + 1 misión) / (7 esperados + 2 misiones) = 3/9
  assert.deepEqual(mio, { cultura: 33, fisico: 100, enfoque: 100 });
  const ana = cumplimientoPorArea('ana', actividad, from, to);
  assert.deepEqual(ana, { cultura: 14, fisico: null, enfoque: null });
  assert.deepEqual(promedioGrupo([ana, { cultura: 50, fisico: null, enfoque: 80 }]), { cultura: 32, fisico: null, enfoque: 80 });
});

test('RDF124: puntos por área de hábitos y misiones completadas', () => {
  const puntos = puntosPorArea(['yo', 'ana', 'nadie'], actividad);
  assert.deepEqual(puntos.get('yo'), { cultura: 35, fisico: 8, enfoque: 20 });
  assert.deepEqual(puntos.get('ana'), { cultura: 5, fisico: 0, enfoque: 0 });
  assert.deepEqual(puntos.get('nadie'), { cultura: 0, fisico: 0, enfoque: 0 });
});

test('RDF117: reglas del reto, fecha límite e invitados', () => {
  const base = { title: '50 sesiones', type: 'enfoque', metric: 'minutos', goal: 50, deadline: '2026-12-01', creatorId: 'yo' };
  assert.equal(new GroupChallenge(base).unit, 'min de enfoque');
  assert.throws(() => new GroupChallenge({ ...base, title: ' ' }), ValidationError);
  assert.throws(() => new GroupChallenge({ ...base, type: 'arte' }), ValidationError);
  assert.throws(() => new GroupChallenge({ ...base, metric: 'km' }), ValidationError);
  assert.throws(() => new GroupChallenge({ ...base, goal: 0 }), ValidationError);
  assert.throws(() => new GroupChallenge({ ...base, deadline: '1/12/2026' }), ValidationError);

  const addDays = (k, n) => new Date(Date.parse(`${k}T00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  assert.throws(() => GroupChallenge.validarFechaLimite('2026-11-22', '2026-11-22', addDays), /posterior a hoy/);
  assert.throws(() => GroupChallenge.validarFechaLimite('2028-01-01', '2026-11-22', addDays), /un año/);
  assert.doesNotThrow(() => GroupChallenge.validarFechaLimite('2026-11-23', '2026-11-22', addDays));

  const amigos = new Set(['ana', 'luis']);
  assert.deepEqual(GroupChallenge.validarInvitados(['ana', 'ana'], amigos), ['ana']);
  assert.throws(() => GroupChallenge.validarInvitados([], amigos), /al menos a un amigo/);
  assert.throws(() => GroupChallenge.validarInvitados(['extraño'], amigos), /Solo puedes invitar a tus amigos/);
});
