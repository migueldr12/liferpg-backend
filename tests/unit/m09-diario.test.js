const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const A = require('../../src/modules/m09-diario-aventura/domain/entities/Activity');

// Reglas puras del M09: cómo se arma cada actividad, su recorrido y las gráficas.
const H1 = '1'.repeat(24);
const TODAY = '2026-11-24'; // martes
const daily = { id: H1, name: 'Caminar 8 000 pasos', type: 'fisico', difficulty: 'facil', frequency: 'diario', focusMinutes: null, active: true, startsOn: new Date('2026-11-21T08:00:00Z'), archivedAt: null };
const weekly = { ...daily, id: '2'.repeat(24), name: 'Leer un capítulo', type: 'cultura', frequency: 'semanal', startsOn: new Date('2026-11-04T08:00:00Z') };
const checkIn = (habitId, dayKey, hour = 14) => ({ id: `c-${dayKey}`, habitId, dayKey, completedAt: new Date(`${dayKey}T${String(hour).padStart(2, '0')}:00:00Z`), xp: 15, points: 10 });

describe('M09 · reglas del dominio', () => {
  test('ids de actividad: misión, sesión y hábito con su día', () => {
    assert.deepEqual(A.parseActivityId(`mision-${'a'.repeat(24)}`), { origin: 'mision', refId: 'a'.repeat(24) });
    assert.deepEqual(A.parseActivityId(`sesion-${'b'.repeat(24)}`), { origin: 'sesion', refId: 'b'.repeat(24) });
    assert.deepEqual(A.parseActivityId(`habito-${H1}-2026-11-24`), { origin: 'habito', refId: H1, key: '2026-11-24' });
    assert.equal(A.parseActivityId(`habito-${H1}-2026-02-31`), null); // ese día no existe
    assert.equal(A.parseActivityId('a-5'), null);
    assert.equal(A.parseActivityId(undefined), null);
  });

  test('misión completada conserva su validación; fallida queda sin puntos y con su motivo', () => {
    const base = { id: 'a'.repeat(24), title: 'Repasar álgebra', type: 'enfoque', durationMin: 45, createdAt: new Date('2026-11-20T10:00:00Z'), xp: 54, points: 45 };
    const done = A.missionActivity({ ...base, status: 'completada', completedAt: new Date('2026-11-23T17:40:00Z'), validation: 'bloqueo' });
    assert.equal(done.status, 'hecha');
    assert.equal(done.validation, 'bloqueo');
    assert.equal(done.points, 45);
    const failed = A.missionActivity({ ...base, status: 'fallida', failedAt: new Date('2026-11-23T17:40:00Z'), failReason: 'salio_app' });
    assert.deepEqual([failed.status, failed.points, failed.xp, failed.failReason], ['fallida', 0, 0, 'salio_app']);
  });

  test('hábito diario: cumplido con check-in, pendiente hoy y fallido los días sin check-in desde que empezó', () => {
    const rows = A.habitActivities(daily, [checkIn(H1, '2026-11-21'), checkIn(H1, '2026-11-23')], { todayKey: TODAY, missedFromKey: '2026-11-15' });
    const byDay = Object.fromEntries(rows.map((r) => [r.id.slice(-10), r.status]));
    assert.deepEqual(byDay, { '2026-11-21': 'hecha', '2026-11-22': 'fallida', '2026-11-23': 'hecha', '2026-11-24': 'pendiente' });
    const pending = rows.find((r) => r.status === 'pendiente');
    assert.equal(pending.at, '2026-11-24T23:59:59.999Z');
    assert.equal(pending.difficulty, 'Fácil');
  });

  test('hábito archivado o desactivado ya no genera pendientes ni fallidos', () => {
    const archived = { ...daily, archivedAt: new Date('2026-11-23T09:00:00Z') };
    const rows = A.habitActivities(archived, [], { todayKey: TODAY, missedFromKey: '2026-11-15' });
    assert.deepEqual(rows.map((r) => r.id.slice(-10)), ['2026-11-21', '2026-11-22']);
    assert.deepEqual(A.habitActivities({ ...daily, active: false }, [checkIn(H1, '2026-11-21')], { todayKey: TODAY, missedFromKey: '2026-11-15' }).map((r) => r.status), ['hecha']);
  });

  test('hábito semanal: un periodo por semana (lunes), cumplido con cualquier check-in de esa semana', () => {
    const rows = A.habitActivities(weekly, [checkIn(weekly.id, '2026-11-12')], { todayKey: TODAY, missedFromKey: '2026-10-26' });
    const byWeek = Object.fromEntries(rows.map((r) => [r.id.slice(-10), r.status]));
    assert.deepEqual(byWeek, { '2026-11-02': 'fallida', '2026-11-09': 'hecha', '2026-11-16': 'fallida', '2026-11-23': 'pendiente' });
    assert.equal(rows.find((r) => r.status === 'pendiente').at, '2026-11-29T23:59:59.999Z');
    assert.equal(A.habitActivityAt(weekly, '2026-11-12', [], { todayKey: TODAY }), null); // no es lunes
    assert.equal(A.habitActivityAt(daily, '2026-11-25', [], { todayKey: TODAY }), null); // día futuro
  });

  test('recorrido: misión con bloqueo, hábito pendiente y sesión abandonada', () => {
    const mission = A.missionActivity({ id: 'a'.repeat(24), title: 'x', type: 'enfoque', durationMin: 25, status: 'completada', completedAt: new Date('2026-11-23T17:40:00Z'), validation: 'bloqueo', xp: 30, points: 25 });
    assert.deepEqual(
      A.timelineOf(mission, { createdAt: new Date('2026-11-20T10:00:00Z'), startedAt: new Date('2026-11-23T17:15:00Z') }).map((t) => t.label),
      ['Creada', 'Sesión de enfoque iniciada', 'Completada con modo concentración'],
    );
    const pending = A.habitActivityAt(daily, TODAY, [], { todayKey: TODAY });
    assert.deepEqual(A.timelineOf(pending).map((t) => [t.label, t.tone]), [['Programado · todos los días', 'bien'], ['Pendiente de check-in · cierra hoy', 'pendiente']]);
    const session = A.sessionActivity({ id: 'c'.repeat(24), type: 'enfoque', habitName: null, plannedMinutes: 25, status: 'abandonada', startedAt: new Date('2026-11-22T16:00:00Z'), endedAt: new Date('2026-11-22T16:05:00Z'), xp: 0, points: 0, abandonReason: 'salio_app' });
    assert.equal(session.title, 'Sesión de enfoque · 25 min');
    assert.deepEqual(A.timelineOf(session, { startedAt: new Date('2026-11-22T16:00:00Z') }).at(-1), { label: 'Saliste de la app · sin puntos', at: '2026-11-22T16:05:00.000Z', tone: 'mal' });
  });

  test('periodos de las gráficas: 7 días, 30 días y los meses del año', () => {
    const week = A.chartPeriods('semana', TODAY).periods;
    assert.deepEqual(week.map((p) => p.label), ['Mié 18', 'Jue 19', 'Vie 20', 'Sáb 21', 'Dom 22', 'Lun 23', 'Hoy']);
    const month = A.chartPeriods('mes', TODAY);
    assert.equal(month.periods.length, 30);
    assert.equal(month.firstDayKey, '2026-10-26');
    assert.equal(month.periods.filter((p) => p.label).length, 7); // cada 5 días y hoy
    const year = A.chartPeriods('anio', TODAY);
    assert.deepEqual([year.periods.length, year.periods[0].label, year.periods.at(-1).key, year.firstDayKey], [11, 'Ene', '2026-11', '2026-01-01']);
  });

  test('las gráficas solo cuentan lo cumplido y agrupan en la zona del juego', () => {
    const chart = A.chartPeriods('semana', TODAY);
    const rows = [
      { status: 'hecha', type: 'enfoque', at: '2026-11-24T03:00:00.000Z' }, // 23 nov, 21:00 en CDMX
      { status: 'hecha', type: 'fisico', at: '2026-11-24T15:00:00.000Z' },
      { status: 'fallida', type: 'fisico', at: '2026-11-24T15:00:00.000Z' },
      { status: 'hecha', type: 'cultura', at: '2026-11-10T15:00:00.000Z' }, // fuera de la semana
    ];
    const buckets = A.completionBuckets(rows, chart, 'America/Mexico_City');
    assert.deepEqual(buckets.find((b) => b.key === '2026-11-23'), { key: '2026-11-23', label: 'Lun 23', cultura: 0, fisico: 0, enfoque: 1 });
    assert.deepEqual(buckets.at(-1), { key: TODAY, label: 'Hoy', cultura: 0, fisico: 1, enfoque: 0 });
    assert.deepEqual(A.distribution(buckets), { cultura: 0, fisico: 1, enfoque: 1 });
  });

  test('una nota editada se marca como editada', () => {
    const at = new Date('2026-11-24T10:00:00Z');
    assert.equal(A.noteView({ id: 'n', text: 't', createdAt: at, updatedAt: at }).edited, false);
    assert.equal(A.noteView({ id: 'n', text: 't', createdAt: at, updatedAt: new Date('2026-11-24T10:05:00Z') }).edited, true);
  });
});
